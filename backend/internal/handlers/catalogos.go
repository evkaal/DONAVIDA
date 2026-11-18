package handlers

import (
	"donavida-backend/internal/database"
	"encoding/json"
	"net/http"
)

func writeCatalogo(w http.ResponseWriter, query string) {
	rows, err := database.DB.Query(query)
	if err != nil {
		http.Error(w, "Error al consultar el catálogo", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type item struct {
		ID           int    `json:"id"`
		Nombre       string `json:"nombre"`
		CodigoPostal string `json:"codigo_postal,omitempty"`
	}
	lista := []item{}
	for rows.Next() {
		var it item
		var cp *string
		// La consulta de colonias trae 3 columnas; las demás, 2.
		cols, _ := rows.Columns()
		if len(cols) == 3 {
			if err := rows.Scan(&it.ID, &it.Nombre, &cp); err != nil {
				continue
			}
			if cp != nil {
				it.CodigoPostal = *cp
			}
		} else {
			if err := rows.Scan(&it.ID, &it.Nombre); err != nil {
				continue
			}
		}
		lista = append(lista, it)
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(lista)
}

// GET /api/catalogos/tipos-institucion
func GetTiposInstitucion(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}
	writeCatalogo(w, `SELECT id, nombre FROM tipos_institucion ORDER BY id`)
}

// GET /api/catalogos/colonias
func GetColonias(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}
	writeCatalogo(w, `SELECT id, nombre, codigo_postal FROM colonias ORDER BY nombre`)
}

// GET /api/catalogos/tipos-sangre
func GetTiposSangre(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}
	writeCatalogo(w, `
		SELECT id, grupo_abo || factor_rh AS nombre FROM tipos_sangre
		ORDER BY CASE grupo_abo WHEN 'A' THEN 1 WHEN 'AB' THEN 2 WHEN 'B' THEN 3 WHEN 'O' THEN 4 ELSE 5 END,
		         factor_rh DESC`)
}

// GET /api/catalogos/hemocomponentes
func GetHemocomponentes(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}
	writeCatalogo(w, `SELECT id, componente AS nombre FROM tipos_hemocomponente ORDER BY id`)
}
