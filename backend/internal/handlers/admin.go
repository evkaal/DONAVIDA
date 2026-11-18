package handlers

import (
	"donavida-backend/internal/database"
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

// requireAdminGeneral valida el JWT del header Authorization y exige
// rol_id == 1 (admin general / dueño del sistema). Devuelve false y ya
// escribió la respuesta de error cuando la autenticación falla.
func requireAdminGeneral(w http.ResponseWriter, r *http.Request) bool {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		http.Error(w, "Token de autorización requerido", http.StatusUnauthorized)
		return false
	}
	tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
	c := &claims{}
	token, err := jwt.ParseWithClaims(tokenStr, c, func(token *jwt.Token) (interface{}, error) {
		return jwtKey, nil
	})
	if err != nil || !token.Valid || c.RolID != 1 {
		http.Error(w, "Acceso denegado", http.StatusForbidden)
		return false
	}
	return true
}

// GET /api/admin/resumen — vista de dueño/desarrollador (rol_id 1):
// totales globales del sistema y desglose por institución.
func GetAdminResumen(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}
	if !requireAdminGeneral(w, r) {
		return
	}

	var totales struct {
		Instituciones          int `json:"instituciones"`
		Usuarios                int `json:"usuarios"`
		UnidadesDisponibles     int `json:"unidadesDisponibles"`
		SolicitudesPendientes   int `json:"solicitudesPendientes"`
	}
	_ = database.DB.QueryRow(`SELECT COUNT(*) FROM instituciones WHERE activo = true`).Scan(&totales.Instituciones)
	_ = database.DB.QueryRow(`SELECT COUNT(*) FROM usuarios WHERE estado = true`).Scan(&totales.Usuarios)
	_ = database.DB.QueryRow(`
		SELECT COUNT(h.id) FROM hemocomponentes h
		JOIN estados_hemocomponente e ON h.estado_id = e.id
		WHERE e.nombre ILIKE 'disponible'`).Scan(&totales.UnidadesDisponibles)
	_ = database.DB.QueryRow(`
		SELECT COUNT(s.id) FROM solicitudes_emergencia s
		JOIN estados_solicitud e ON s.estado_id = e.id
		WHERE e.nombre ILIKE 'pendiente'`).Scan(&totales.SolicitudesPendientes)

	type fila struct {
		ID                    int    `json:"id"`
		Nombre                string `json:"nombre"`
		Usuarios              int    `json:"usuarios"`
		UnidadesDisponibles   int    `json:"unidadesDisponibles"`
		SolicitudesPendientes int    `json:"solicitudesPendientes"`
	}
	rows, err := database.DB.Query(`
		SELECT i.id, i.nombre,
			(SELECT COUNT(*) FROM usuarios u WHERE u.institucion_id = i.id AND u.estado = true),
			(SELECT COUNT(*) FROM hemocomponentes h
			 JOIN estados_hemocomponente eh ON h.estado_id = eh.id
			 WHERE h.institucion_id = i.id AND eh.nombre ILIKE 'disponible'),
			(SELECT COUNT(*) FROM solicitudes_emergencia s
			 JOIN estados_solicitud es ON s.estado_id = es.id
			 WHERE s.institucion_solicitante_id = i.id AND es.nombre ILIKE 'pendiente')
		FROM instituciones i
		ORDER BY i.nombre`)
	if err != nil {
		log.Printf("Error al consultar resumen admin: %v", err)
		http.Error(w, "Error al obtener el resumen", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	instituciones := []fila{}
	for rows.Next() {
		var f fila
		if err := rows.Scan(&f.ID, &f.Nombre, &f.Usuarios, &f.UnidadesDisponibles, &f.SolicitudesPendientes); err != nil {
			continue
		}
		instituciones = append(instituciones, f)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"totales":       totales,
		"instituciones": instituciones,
	})
}
