package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"donavida-backend/internal/database"
)

type unidadResp struct {
	Codigo         string `json:"codigo_unidad"`
	TipoSangre     string `json:"tipo_sangre"`
	Hemocomponente string `json:"tipo_hemocomponente"`
	Extraccion     string `json:"fecha_extraccion"`
	Caducidad      string `json:"fecha_caducidad"`
	Estado         string `json:"estado"`
}

func ListarUnidades(w http.ResponseWriter, r *http.Request) {
	search := "%" + r.URL.Query().Get("search") + "%"
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	}

	var total int
	database.DB.QueryRow(`SELECT COUNT(*) FROM hemocomponentes WHERE codigo_unidad ILIKE $1`, search).Scan(&total)

	rows, err := database.DB.Query(`
		SELECT h.codigo_unidad,
		       ts.grupo_abo || ts.factor_rh,
		       th.componente,
		       h.fecha_extraccion::text,
		       h.fecha_caducidad::text,
		       eh.nombre
		FROM hemocomponentes h
		JOIN tipos_sangre ts ON ts.id = h.tipo_sangre_id
		JOIN tipos_hemocomponente th ON th.id = h.tipo_hemocomponente_id
		JOIN estados_hemocomponente eh ON eh.id = h.estado_id
		WHERE h.codigo_unidad ILIKE $1
		ORDER BY h.fecha_extraccion DESC, h.id DESC
		LIMIT $2 OFFSET $3`,
		search, limit, (page-1)*limit)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	data := []unidadResp{}
	for rows.Next() {
		var u unidadResp
		if err := rows.Scan(&u.Codigo, &u.TipoSangre, &u.Hemocomponente, &u.Extraccion, &u.Caducidad, &u.Estado); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		data = append(data, u)
	}

	totalPages := (total + limit - 1) / limit
	if totalPages < 1 {
		totalPages = 1
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"data": data,
		"meta": map[string]int{"total_pages": totalPages, "total_records": total, "current_page": page},
	})
}
