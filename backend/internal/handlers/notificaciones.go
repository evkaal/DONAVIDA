package handlers

import (
	"database/sql"
	"donavida-backend/internal/database"
	"fmt"
	"net/http"
	"strconv"
	"strings"
)

// ---------------------------------------------------------------------------
// GET /api/notificaciones — notificaciones del usuario de la sesión
// (las no leídas primero, luego las más recientes). Sirven para avisar,
// entre otras cosas, que una solicitud ya fue atendida por otra institución.
// ---------------------------------------------------------------------------

type notificacion struct {
	ID        int    `json:"id"`
	Mensaje   string `json:"mensaje"`
	Leida     bool   `json:"leida"`
	Fecha     string `json:"fecha"`
	Solicitud string `json:"solicitud,omitempty"`
	// Campos que lee la app móvil (NotificationItem.fromJson): mismo
	// contenido con las claves que espera, para no romper la web (que
	// lee mensaje/leida/fecha) ni la app (que lee titulo/descripcion/
	// fecha_hora/leida/tipo).
	Titulo      string `json:"titulo"`
	Descripcion string `json:"descripcion"`
	FechaHora   string `json:"fecha_hora"`
	EsHoy       bool   `json:"es_hoy"`
	Tipo        string `json:"tipo"`
	BotonAccion string `json:"boton_accion,omitempty"`
}

// tipoNotificacionApp traduce el nombre del tipo de alerta al tipo que
// entiende la app móvil (bloodAlert, reminder, donation, available,
// profile). Los tipos de alerta para la app se crean bajo demanda (ver
// notificarDonacionRegistradaMovil en movil.go).
func tipoNotificacionApp(nombreTipoAlerta string) string {
	switch normalizarNombre(nombreTipoAlerta) {
	case "solicitud_sangre", "se necesita sangre":
		return "bloodAlert"
	case "recordatorio":
		return "reminder"
	case "solicitud_atendida", "donacion_registrada":
		return "donation"
	case "ya_puedes_donar":
		return "available"
	default:
		return "profile"
	}
}

// tituloNotificacion arma el título corto que muestra la app a partir
// del tipo de alerta; si no hay uno conocido, usa el inicio del mensaje.
func tituloNotificacion(nombreTipoAlerta, mensaje string) string {
	switch normalizarNombre(nombreTipoAlerta) {
	case "solicitud_atendida":
		return "Solicitud atendida"
	case "donacion_registrada":
		return "Donación registrada"
	case "ya_puedes_donar":
		return "Ya puedes volver a donar"
	case "solicitud_sangre":
		return "Se necesita sangre"
	case "recordatorio":
		return "Recordatorio de donación"
	}
	mensaje = strings.TrimSpace(mensaje)
	if len([]rune(mensaje)) > 60 {
		return string([]rune(mensaje)[:60]) + "…"
	}
	return mensaje
}

func GetNotificaciones(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}
	sesion, ok := sesionDesdeToken(r)
	if !ok {
		http.Error(w, "Token de autorización requerido", http.StatusUnauthorized)
		return
	}
	// El destinatario depende de la sesión: un usuario web lee por
	// usuario_id; un usuario móvil, por usuario_movil_id (columna de
	// la migración 000006; la de web queda en NULL en sus filas).
	columnaDestino := "n.usuario_id"
	if sesion.EsMovil {
		columnaDestino = "n.usuario_movil_id"
	}
	rows, err := database.DB.Query(`
		SELECT n.id, a.mensaje, n.leida,
		       TO_CHAR(a.created_at, 'DD Mon · HH24:MI') AS fecha,
		       a.solicitud_id, ta.nombre AS tipo_alerta,
		       (DATE(a.created_at) = CURRENT_DATE) AS es_hoy
		FROM notificaciones n
		JOIN alertas a ON n.alerta_id = a.id
		JOIN tipos_alerta ta ON ta.id = a.tipo_alerta_id
		WHERE `+columnaDestino+` = $1
		ORDER BY n.leida ASC, a.created_at DESC
	`, sesion.ID)
	if err != nil {
		http.Error(w, "Error al obtener notificaciones", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	lista := []notificacion{}
	for rows.Next() {
		var nt notificacion
		var solicitudID sql.NullInt64
		var tipoAlerta string
		if err := rows.Scan(&nt.ID, &nt.Mensaje, &nt.Leida, &nt.Fecha, &solicitudID, &tipoAlerta, &nt.EsHoy); err != nil {
			continue
		}
		if solicitudID.Valid {
			nt.Solicitud = fmt.Sprintf("SOL-%04d", solicitudID.Int64)
		}
		nt.Titulo = tituloNotificacion(tipoAlerta, nt.Mensaje)
		nt.Descripcion = nt.Mensaje
		nt.FechaHora = nt.Fecha
		nt.Tipo = tipoNotificacionApp(tipoAlerta)
		lista = append(lista, nt)
	}
	writeJSON(w, http.StatusOK, lista)
}

// ---------------------------------------------------------------------------
// PATCH /api/notificaciones/{id}/leida — marca una notificación como leída.
// Solo la propia (el usuario de la sesión debe ser su destinatario).
// ---------------------------------------------------------------------------

func MarcarNotificacionLeida(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}
	sesion, ok := sesionDesdeToken(r)
	if !ok {
		http.Error(w, "Token de autorización requerido", http.StatusUnauthorized)
		return
	}
	// Ruta: /api/notificaciones/123/leida
	rest := strings.TrimPrefix(r.URL.Path, "/api/notificaciones/")
	parts := strings.Split(strings.Trim(rest, "/"), "/")
	if len(parts) != 2 || strings.ToLower(parts[1]) != "leida" {
		http.Error(w, "Ruta inválida: se espera /api/notificaciones/{id}/leida", http.StatusBadRequest)
		return
	}
	id, err := strconv.Atoi(parts[0])
	if err != nil {
		http.Error(w, "ID de notificación inválido", http.StatusBadRequest)
		return
	}
	columnaDestino := "usuario_id"
	if sesion.EsMovil {
		columnaDestino = "usuario_movil_id"
	}
	res, err := database.DB.Exec(`
		UPDATE notificaciones SET leida = true, fecha_lectura = NOW()
		WHERE id = $1 AND `+columnaDestino+` = $2
	`, id, sesion.ID)
	if err != nil {
		http.Error(w, "Error al marcar la notificación como leída", http.StatusInternalServerError)
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		http.Error(w, "Notificación no encontrada", http.StatusNotFound)
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"mensaje": "Notificación marcada como leída"})
}

// ---------------------------------------------------------------------------
// POST /api/notificaciones/marcar-leidas — marca TODAS las notificaciones
// del usuario de la sesión como leídas (la app lo define en
// ApiConstants.markNotificationsRead). Solo las propias.
// ---------------------------------------------------------------------------

func MarcarTodasLeidas(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}
	sesion, ok := sesionDesdeToken(r)
	if !ok {
		http.Error(w, "Token de autorización requerido", http.StatusUnauthorized)
		return
	}
	columnaDestino := "usuario_id"
	if sesion.EsMovil {
		columnaDestino = "usuario_movil_id"
	}
	res, err := database.DB.Exec(`
		UPDATE notificaciones SET leida = true, fecha_lectura = NOW()
		WHERE `+columnaDestino+` = $1 AND leida = false
	`, sesion.ID)
	if err != nil {
		http.Error(w, "Error al marcar las notificaciones como leídas", http.StatusInternalServerError)
		return
	}
	n, _ := res.RowsAffected()
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"mensaje":  "Notificaciones marcadas como leídas",
		"marcadas": n,
	})
}
