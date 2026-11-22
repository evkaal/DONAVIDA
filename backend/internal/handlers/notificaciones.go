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
	rows, err := database.DB.Query(`
		SELECT n.id, a.mensaje, n.leida,
		       TO_CHAR(a.created_at, 'DD Mon · HH24:MI') AS fecha,
		       a.solicitud_id
		FROM notificaciones n
		JOIN alertas a ON n.alerta_id = a.id
		WHERE n.usuario_id = $1
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
		if err := rows.Scan(&nt.ID, &nt.Mensaje, &nt.Leida, &nt.Fecha, &solicitudID); err != nil {
			continue
		}
		if solicitudID.Valid {
			nt.Solicitud = fmt.Sprintf("SOL-%04d", solicitudID.Int64)
		}
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
	res, err := database.DB.Exec(`
		UPDATE notificaciones SET leida = true, fecha_lectura = NOW()
		WHERE id = $1 AND usuario_id = $2
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
