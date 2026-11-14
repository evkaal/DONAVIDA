package handlers

import (
	"database/sql"
	"donavida-backend/internal/database"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type historicoItem struct {
	ID          string     `json:"id"`
	Tipo        string     `json:"tipo"`
	Institucion string     `json:"institucion"`
	Prioridad   string     `json:"prioridad"`
	Unidades    int        `json:"unidades"`
	Solicitada  time.Time  `json:"solicitada"`
	Cerrada     *time.Time `json:"cerrada"`
	Estado      string     `json:"estado"`
}

// GetHistorico devuelve el histórico paginado de solicitudes de la institución
// autenticada. El administrador general puede consultar la red completa.
func GetHistorico(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}

	userClaims, err := claimsFromRequest(r)
	if err != nil {
		http.Error(w, "Sesión no válida", http.StatusUnauthorized)
		return
	}

	var institutionID sql.NullInt64
	err = database.DB.QueryRow(`SELECT institucion_id FROM usuarios WHERE email = $1 AND estado = true`, userClaims.Email).Scan(&institutionID)
	if err != nil {
		http.Error(w, "No se encontró el usuario de la sesión", http.StatusUnauthorized)
		return
	}
	if userClaims.RolID != 1 && !institutionID.Valid {
		http.Error(w, "La cuenta no tiene una institución asignada", http.StatusForbidden)
		return
	}

	query := r.URL.Query()
	tipo := query.Get("tipo")
	if tipo != "enviadas" && tipo != "recibidas" {
		tipo = "todas"
	}
	estado := query.Get("estado")
	if estado == "todos" {
		estado = ""
	}
	periodo := query.Get("periodo")
	if periodo == "" {
		periodo = "ultimos_20"
	}

	page := parsePositiveInt(query.Get("pagina"), 1)
	limit := parsePositiveInt(query.Get("limite"), 8)
	if limit > 50 {
		limit = 50
	}

	conditions := make([]string, 0, 5)
	args := make([]any, 0, 5)
	addArg := func(value any) string {
		args = append(args, value)
		return fmt.Sprintf("$%d", len(args))
	}
	var institutionArg string
	if institutionID.Valid {
		institutionArg = addArg(institutionID.Int64)
		conditions = append(conditions, fmt.Sprintf(`(
			s.institucion_solicitante_id = %s OR EXISTS (
				SELECT 1 FROM solicitud_detalles sd_scope
				JOIN asignaciones_unidades au_scope ON au_scope.solicitud_detalle_id = sd_scope.id
				JOIN hemocomponentes h_scope ON h_scope.id = au_scope.hemocomponente_id
				WHERE sd_scope.solicitud_id = s.id AND h_scope.institucion_id = %s
			)
		)`, institutionArg, institutionArg))
	}

	if estado != "" {
		conditions = append(conditions, "e.nombre ILIKE "+addArg(estado))
	}
	if search := strings.TrimSpace(query.Get("busqueda")); search != "" {
		searchArg := addArg("%" + search + "%")
		conditions = append(conditions, fmt.Sprintf(`(
			('SOL-' || LPAD(s.id::text, 4, '0')) ILIKE %s OR CAST(s.id AS TEXT) ILIKE %s OR i.nombre ILIKE %s OR EXISTS (
				SELECT 1 FROM solicitud_detalles sd_search
				JOIN asignaciones_unidades au_search ON au_search.solicitud_detalle_id = sd_search.id
				JOIN hemocomponentes h_search ON h_search.id = au_search.hemocomponente_id
				JOIN instituciones ir_search ON ir_search.id = h_search.institucion_id
			WHERE sd_search.solicitud_id = s.id AND ir_search.nombre ILIKE %s
			)
		)`, searchArg, searchArg, searchArg, searchArg))
	}

	switch periodo {
	case "mes_actual":
		conditions = append(conditions, "s.fecha_solicitud >= date_trunc('month', CURRENT_DATE) AND s.fecha_solicitud < CURRENT_DATE + INTERVAL '1 day'")
	case "mes_anterior":
		conditions = append(conditions, "s.fecha_solicitud >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month') AND s.fecha_solicitud < date_trunc('month', CURRENT_DATE)")
	case "todo_ano":
		conditions = append(conditions, "s.fecha_solicitud >= date_trunc('year', CURRENT_DATE) AND s.fecha_solicitud < date_trunc('year', CURRENT_DATE) + INTERVAL '1 year'")
	default:
		conditions = append(conditions, "s.fecha_solicitud >= CURRENT_DATE - INTERVAL '19 days' AND s.fecha_solicitud < CURRENT_DATE + INTERVAL '1 day'")
	}

	baseFrom := `FROM solicitudes_emergencia s
		JOIN instituciones i ON i.id = s.institucion_solicitante_id
		JOIN estados_solicitud e ON e.id = s.estado_id
		LEFT JOIN niveles_prioridad p ON p.id = s.prioridad_id
		LEFT JOIN solicitud_detalles sd ON sd.solicitud_id = s.id
		LEFT JOIN LATERAL (
			SELECT string_agg(DISTINCT ir.nombre, ', ' ORDER BY ir.nombre) AS nombres
			FROM solicitud_detalles sd_dest
			JOIN asignaciones_unidades au_dest ON au_dest.solicitud_detalle_id = sd_dest.id
			JOIN hemocomponentes h_dest ON h_dest.id = au_dest.hemocomponente_id
			JOIN instituciones ir ON ir.id = h_dest.institucion_id
			WHERE sd_dest.solicitud_id = s.id
		) destinos ON true`

	baseConditions := append([]string(nil), conditions...)
	listConditions := append([]string(nil), baseConditions...)
	if institutionArg != "" && tipo == "enviadas" {
		listConditions = append(listConditions, "s.institucion_solicitante_id = "+institutionArg)
	} else if institutionArg != "" && tipo == "recibidas" {
		listConditions = append(listConditions, fmt.Sprintf(`s.institucion_solicitante_id <> %s AND EXISTS (
			SELECT 1 FROM solicitud_detalles sd_received
			JOIN asignaciones_unidades au_received ON au_received.solicitud_detalle_id = sd_received.id
			JOIN hemocomponentes h_received ON h_received.id = au_received.hemocomponente_id
			WHERE sd_received.solicitud_id = s.id AND h_received.institucion_id = %s
		)`, institutionArg, institutionArg))
	}
	buildWhere := func(items []string) string {
		if len(items) == 0 {
			return ""
		}
		return " WHERE " + strings.Join(items, " AND ")
	}
	where := buildWhere(listConditions)

	var total int
	if err := database.DB.QueryRow("SELECT COUNT(DISTINCT s.id) "+baseFrom+where, args...).Scan(&total); err != nil {
		http.Error(w, "Error al consultar el total del histórico", http.StatusInternalServerError)
		return
	}

	countForTab := func(tab string) (int, error) {
		tabConditions := append([]string(nil), conditions...)
		if institutionArg != "" && tab == "enviadas" {
			tabConditions = append(tabConditions, "s.institucion_solicitante_id = "+institutionArg)
		} else if institutionArg != "" && tab == "recibidas" {
			tabConditions = append(tabConditions, fmt.Sprintf(`s.institucion_solicitante_id <> %s AND EXISTS (
				SELECT 1 FROM solicitud_detalles sd_count
				JOIN asignaciones_unidades au_count ON au_count.solicitud_detalle_id = sd_count.id
				JOIN hemocomponentes h_count ON h_count.id = au_count.hemocomponente_id
				WHERE sd_count.solicitud_id = s.id AND h_count.institucion_id = %s
			)`, institutionArg, institutionArg))
		}
		tabWhere := buildWhere(tabConditions)
		var count int
		err := database.DB.QueryRow("SELECT COUNT(DISTINCT s.id) "+baseFrom+tabWhere, args...).Scan(&count)
		return count, err
	}

	countAll, err := countForTab("todas")
	if err != nil {
		http.Error(w, "Error al consultar el histórico", http.StatusInternalServerError)
		return
	}
	countSent, err := countForTab("enviadas")
	if err != nil {
		http.Error(w, "Error al consultar el histórico", http.StatusInternalServerError)
		return
	}
	countReceived, err := countForTab("recibidas")
	if err != nil {
		http.Error(w, "Error al consultar el histórico", http.StatusInternalServerError)
		return
	}

	pages := (total + limit - 1) / limit
	if pages == 0 {
		pages = 1
	}
	if page > pages {
		page = pages
	}
	args = append(args, limit, (page-1)*limit)
	limitArg, offsetArg := fmt.Sprintf("$%d", len(args)-1), fmt.Sprintf("$%d", len(args))

	rows, err := database.DB.Query(`SELECT
		s.id,
		CASE WHEN `+nullableInstitutionExpression(institutionArg)+` THEN 'enviada' ELSE 'recibida' END,
		CASE WHEN `+nullableInstitutionExpression(institutionArg)+` THEN COALESCE(destinos.nombres, i.nombre) ELSE i.nombre END,
		COALESCE(p.nombre, 'Sin prioridad'),
		COALESCE(SUM(sd.cantidad), 0),
		s.fecha_solicitud,
		s.fecha_cierre,
		e.nombre
	`+baseFrom+where+`
		GROUP BY s.id, i.nombre, p.nombre, e.nombre, destinos.nombres
		ORDER BY s.fecha_solicitud DESC, s.id DESC
		LIMIT `+limitArg+` OFFSET `+offsetArg, args...)
	if err != nil {
		http.Error(w, "Error al consultar las solicitudes históricas", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	items := make([]historicoItem, 0, limit)
	for rows.Next() {
		var item historicoItem
		var id int
		var closedAt sql.NullTime
		if err := rows.Scan(&id, &item.Tipo, &item.Institucion, &item.Prioridad, &item.Unidades, &item.Solicitada, &closedAt, &item.Estado); err != nil {
			http.Error(w, "Error al procesar el histórico", http.StatusInternalServerError)
			return
		}
		item.ID = fmt.Sprintf("SOL-%04d", id)
		if closedAt.Valid {
			item.Cerrada = &closedAt.Time
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		http.Error(w, "Error al procesar el histórico", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"total": total, "pagina": page, "totalPaginas": pages,
		"vistaGlobal": !institutionID.Valid,
		"conteos":     map[string]int{"todas": countAll, "enviadas": countSent, "recibidas": countReceived},
		"solicitudes": items,
	})
}

func claimsFromRequest(r *http.Request) (*claims, error) {
	parts := strings.Fields(r.Header.Get("Authorization"))
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return nil, errors.New("falta token")
	}
	parsed, err := jwt.ParseWithClaims(parts[1], &claims{}, func(token *jwt.Token) (any, error) {
		if token.Method != jwt.SigningMethodHS256 {
			return nil, errors.New("algoritmo no permitido")
		}
		return jwtKey, nil
	})
	if err != nil || !parsed.Valid {
		return nil, errors.New("token no válido")
	}
	userClaims, ok := parsed.Claims.(*claims)
	if !ok || userClaims.Email == "" {
		return nil, errors.New("claims no válidos")
	}
	return userClaims, nil
}

func parsePositiveInt(value string, fallback int) int {
	number, err := strconv.Atoi(value)
	if err != nil || number < 1 {
		return fallback
	}
	return number
}

func nullableInstitutionExpression(institutionArg string) string {
	if institutionArg == "" {
		return "TRUE"
	}
	return "s.institucion_solicitante_id = " + institutionArg
}
