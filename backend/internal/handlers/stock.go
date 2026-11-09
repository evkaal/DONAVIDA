package handlers

import (
	"donavida-backend/internal/database"
	"encoding/json"
	"fmt"
	"net/http"
)

// Estructura para los KPIs superiores dinámicos
type StockKpis struct {
	UnidadesDisponibles   int    `json:"unidadesDisponibles"`
	TiposConExistencia    int    `json:"tiposConExistencia"`
	BajoMinimo            int    `json:"bajoMinimo"`
	TotalCombinaciones    int    `json:"totalCombinaciones"`
	SinExistencias        int    `json:"sinExistencias"`
	DetalleSinExistencias string `json:"detalleSinExistencias"`
	PorCaducar            int    `json:"porCaducar"`
	DiasCaducidad         int    `json:"diasCaducidad"`
}

// --- ESTRUCTURAS COMPLEMENTARIAS NECESARIAS ---
type CeldaInfo struct {
	Cant   int    `json:"cant"`
	Min    int    `json:"min"`
	Estado string `json:"estado"` // "normal", "bajo", "sin_existencia"
}

type FilaMatriz struct {
	Tipo              string    `json:"tipo"`
	SangreTotal       CeldaInfo `json:"sangreTotal"`
	ConcEritrocitario CeldaInfo `json:"concEritrocitario"`
	PlasmaFresco      CeldaInfo `json:"plasmaFresco"`
	Plaquetas         CeldaInfo `json:"plaquetas"`
	Total             int       `json:"total"`
}

type AlertaItem struct {
	ID          int    `json:"id"`
	TipoAlerta  string `json:"tipoAlerta"` // "critica", "advertencia", "caducidad"
	Titulo      string `json:"titulo"`
	Descripcion string `json:"descripcion"`
	Tiempo      string `json:"tiempo"`
}

type UnidadCaducidad struct {
	Codigo           string `json:"codigo"`
	Tipo             string `json:"tipo"`
	Hemocomponente   string `json:"hemocomponente"`
	FechaExtraccion  string `json:"fechaExtraccion"`
	FechaCaducidad   string `json:"fechaCaducidad"`
	VigenciaRestante string `json:"vigenciaRestante"`
}
// ----------------------------------------------

// Helper para obtener el ID de la institución a partir de su nombre
func obtenerInstitucionID(nombreHospital string) int {
	var id int
	err := database.DB.QueryRow(`SELECT id FROM instituciones WHERE nombre ILIKE $1 LIMIT 1`, nombreHospital).Scan(&id)
	if err != nil {
		return 1 // Por defecto el 1 si no se encuentra
	}
	return id
}


// Endpoint para los KPIs superiores (calculados con umbrales reales de la BD)
func GetStockKpis(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}

	hospital := r.URL.Query().Get("hospital")
	if hospital == "" {
		hospital = "Hospital General Dr. Aurelio Valdivieso"
	}
	instID := obtenerInstitucionID(hospital)

	var kpis StockKpis
	kpis.DiasCaducidad = 7
	kpis.TotalCombinaciones = 32

	// 1. Unidades disponibles totales para este hospital
	database.DB.QueryRow(`
		SELECT COUNT(h.id) FROM hemocomponentes h
		JOIN estados_hemocomponente e ON h.estado_id = e.id
		WHERE e.nombre ILIKE 'disponible' AND h.institucion_id = $1
	`, instID).Scan(&kpis.UnidadesDisponibles)

	// 2. Tipos de sangre con existencia en este hospital
	database.DB.QueryRow(`
		SELECT COUNT(DISTINCT h.tipo_sangre_id) FROM hemocomponentes h
		JOIN estados_hemocomponente e ON h.estado_id = e.id
		WHERE e.nombre ILIKE 'disponible' AND h.institucion_id = $1
	`, instID).Scan(&kpis.TiposConExistencia)

	// 3. Unidades próximas a caducar en este hospital
	database.DB.QueryRow(`
		SELECT COUNT(h.id) FROM hemocomponentes h 
		JOIN estados_hemocomponente e ON h.estado_id = e.id
		WHERE e.nombre ILIKE 'disponible' AND h.institucion_id = $1
		  AND h.fecha_caducidad BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
	`, instID).Scan(&kpis.PorCaducar)

	// 4. Combinaciones SIN existencias para este hospital
	database.DB.QueryRow(`
		SELECT COUNT(*) FROM (
			SELECT ts.id AS tipo_id, th.id AS hemo_id
			FROM tipos_sangre ts
			CROSS JOIN tipos_hemocomponente th
			WHERE th.id <= 4
			EXCEPT
			SELECT DISTINCT h.tipo_sangre_id, h.tipo_hemocomponente_id
			FROM hemocomponentes h
			JOIN estados_hemocomponente e ON h.estado_id = e.id
			WHERE e.nombre ILIKE 'disponible' AND h.institucion_id = $1
		) AS sin_stock
	`, instID).Scan(&kpis.SinExistencias)

	// Detalle de sin existencias
	var detalleSin string
	err := database.DB.QueryRow(`
		SELECT ts.grupo_abo || ts.factor_rh || ' - ' || th.componente
		FROM tipos_sangre ts
		CROSS JOIN tipos_hemocomponente th
		WHERE th.id <= 4
		  AND NOT EXISTS (
			SELECT 1 FROM hemocomponentes h
			JOIN estados_hemocomponente e ON h.estado_id = e.id
			WHERE h.tipo_sangre_id = ts.id 
			  AND h.tipo_hemocomponente_id = th.id 
			  AND e.nombre ILIKE 'disponible'
			  AND h.institucion_id = $1
		  )
		LIMIT 1;
	`, instID).Scan(&detalleSin)
	if err == nil && detalleSin != "" {
		kpis.DetalleSinExistencias = detalleSin
	} else {
		kpis.DetalleSinExistencias = "Sin incidencias críticas"
	}

	// 5. Combinaciones BAJO EL MÍNIMO para este hospital
	database.DB.QueryRow(`
		SELECT COUNT(*) FROM umbrales_stock u
		WHERE u.institucion_id = $1 AND (
			SELECT COUNT(h.id) FROM hemocomponentes h
			JOIN estados_hemocomponente e ON h.estado_id = e.id
			WHERE h.institucion_id = u.institucion_id
			  AND h.tipo_sangre_id = u.tipo_sangre_id
			  AND h.tipo_hemocomponente_id = u.tipo_hemocomponente_id
			  AND e.nombre ILIKE 'disponible'
		) < u.stock_minimo
	`, instID).Scan(&kpis.BajoMinimo)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(kpis)
}

func GetMatrizInventario(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}

	hospital := r.URL.Query().Get("hospital")
	if hospital == "" {
		hospital = "Hospital General Dr. Aurelio Valdivieso"
	}
	instID := obtenerInstitucionID(hospital)

	rowsTipos, err := database.DB.Query(`SELECT id, grupo_abo || factor_rh AS tipo FROM tipos_sangre ORDER BY id`)
	if err != nil {
		http.Error(w, "Error al consultar tipos de sangre", http.StatusInternalServerError)
		return
	}
	defer rowsTipos.Close()

	var matriz []FilaMatriz

	for rowsTipos.Next() {
		var tipoID int
		var tipoStr string
		if err := rowsTipos.Scan(&tipoID, &tipoStr); err != nil {
			continue
		}

		fila := FilaMatriz{Tipo: tipoStr}

		getCelda := func(hemoID int) CeldaInfo {
			var cantidad int
			var minStock int = 5

			database.DB.QueryRow(`
				SELECT COUNT(h.id) FROM hemocomponentes h
				JOIN estados_hemocomponente e ON h.estado_id = e.id
				WHERE h.tipo_sangre_id = $1 AND h.tipo_hemocomponente_id = $2 
				  AND e.nombre ILIKE 'disponible' AND h.institucion_id = $3
			`, tipoID, hemoID, instID).Scan(&cantidad)

			database.DB.QueryRow(`
				SELECT stock_minimo FROM umbrales_stock 
				WHERE tipo_sangre_id = $1 AND tipo_hemocomponente_id = $2 AND institucion_id = $3 LIMIT 1
			`, tipoID, hemoID, instID).Scan(&minStock)

			estado := "normal"
			if cantidad == 0 {
				estado = "sin_existencia"
			} else if cantidad < minStock {
				estado = "bajo"
			}

			return CeldaInfo{Cant: cantidad, Min: minStock, Estado: estado}
		}

		fila.SangreTotal = getCelda(2)
		fila.ConcEritrocitario = getCelda(1)
		fila.PlasmaFresco = getCelda(4)
		fila.Plaquetas = getCelda(3)

		fila.Total = fila.SangreTotal.Cant + fila.ConcEritrocitario.Cant + fila.PlasmaFresco.Cant + fila.Plaquetas.Cant
		matriz = append(matriz, fila)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(matriz)
}

func GetAlertasStock(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}

	hospital := r.URL.Query().Get("hospital")
	if hospital == "" {
		hospital = "Hospital General Dr. Aurelio Valdivieso"
	}
	instID := obtenerInstitucionID(hospital)

	var alertas []AlertaItem
	counter := 1

	rowsBajo, err := database.DB.Query(`
		SELECT ts.grupo_abo || ts.factor_rh AS tipo, th.componente,
		       (SELECT COUNT(h.id) FROM hemocomponentes h JOIN estados_hemocomponente e ON h.estado_id = e.id WHERE h.tipo_sangre_id = ts.id AND h.tipo_hemocomponente_id = th.id AND e.nombre ILIKE 'disponible' AND h.institucion_id = u.institucion_id) AS stock_actual,
		       u.stock_minimo
		FROM umbrales_stock u
		JOIN tipos_sangre ts ON u.tipo_sangre_id = ts.id
		JOIN tipos_hemocomponente th ON u.tipo_hemocomponente_id = th.id
		WHERE u.institucion_id = $1 AND (
			SELECT COUNT(h.id) FROM hemocomponentes h JOIN estados_hemocomponente e ON h.estado_id = e.id WHERE h.tipo_sangre_id = ts.id AND h.tipo_hemocomponente_id = th.id AND e.nombre ILIKE 'disponible' AND h.institucion_id = u.institucion_id
		) < u.stock_minimo
		LIMIT 5;
	`, instID)
	if err == nil {
		defer rowsBajo.Close()
		for rowsBajo.Next() {
			var tipo, componente string
			var stockActual, stockMin int
			if err := rowsBajo.Scan(&tipo, &componente, &stockActual, &stockMin); err == nil {
				tipoAlerta := "advertencia"
				desc := fmt.Sprintf("%d disponibles - mínimo %d", stockActual, stockMin)
				if stockActual == 0 {
					tipoAlerta = "critica"
					desc = fmt.Sprintf("Sin existencias - mínimo %d", stockMin)
				}
				alertas = append(alertas, AlertaItem{
					ID:          counter,
					TipoAlerta:  tipoAlerta,
					Titulo:      fmt.Sprintf("%s %s", tipo, componente),
					Descripcion: desc,
					Tiempo:      "Actualizado",
				})
				counter++
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(alertas)
}

func GetProximasCaducar(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}

	hospital := r.URL.Query().Get("hospital")
	if hospital == "" {
		hospital = "Hospital General Dr. Aurelio Valdivieso"
	}
	instID := obtenerInstitucionID(hospital)

	query := `
		SELECT 
			h.codigo_unidad,
			ts.grupo_abo || ts.factor_rh AS tipo,
			th.componente AS hemocomponente,
			TO_CHAR(h.fecha_extraccion, 'DD/MM/YYYY') AS f_ext,
			TO_CHAR(h.fecha_caducidad, 'DD/MM/YYYY') AS f_cad,
			'Vence en ' || (h.fecha_caducidad - CURRENT_DATE) || ' días' AS vigencia
		FROM hemocomponentes h
		JOIN tipos_sangre ts ON h.tipo_sangre_id = ts.id
		JOIN tipos_hemocomponente th ON h.tipo_hemocomponente_id = th.id
		JOIN estados_hemocomponente e ON h.estado_id = e.id
		WHERE e.nombre ILIKE 'destacado' OR (e.nombre ILIKE 'disponible' AND h.institucion_id = $1)
		  AND h.fecha_caducidad BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
		ORDER BY h.fecha_caducidad ASC
		LIMIT 10;
	`
    // Versión limpia para caducar filtrando por institución:
    query = `
		SELECT 
			h.codigo_unidad,
			ts.grupo_abo || ts.factor_rh AS tipo,
			th.componente AS hemocomponente,
			TO_CHAR(h.fecha_extraccion, 'DD/MM/YYYY') AS f_ext,
			TO_CHAR(h.fecha_caducidad, 'DD/MM/YYYY') AS f_cad,
			'Vence en ' || (h.fecha_caducidad - CURRENT_DATE) || ' días' AS vigencia
		FROM hemocomponentes h
		JOIN tipos_sangre ts ON h.tipo_sangre_id = ts.id
		JOIN tipos_hemocomponente th ON h.tipo_hemocomponente_id = th.id
		JOIN estados_hemocomponente e ON h.estado_id = e.id
		WHERE e.nombre ILIKE 'disponible' AND h.institucion_id = $1
		  AND h.fecha_caducidad BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
		ORDER BY h.fecha_caducidad ASC
		LIMIT 10;
	`

	rows, err := database.DB.Query(query, instID)
	var lista []UnidadCaducidad

	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var u UnidadCaducidad
			if err := rows.Scan(&u.Codigo, &u.Tipo, &u.Hemocomponente, &u.FechaExtraccion, &u.FechaCaducidad, &u.VigenciaRestante); err == nil {
				lista = append(lista, u)
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(lista)
}



// Endpoint para obtener la lista de instituciones en el selector
func GetInstituciones(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}

	rows, err := database.DB.Query(`SELECT id, nombre FROM instituciones WHERE activo = true ORDER BY id`)
	if err != nil {
		http.Error(w, "Error al consultar instituciones", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type Institucion struct {
		ID     int    `json:"id"`
		Nombre string `json:"nombre"`
	}

	var lista []Institucion
	for rows.Next() {
		var i Institucion
		if err := rows.Scan(&i.ID, &i.Nombre); err == nil {
			lista = append(lista, i)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(lista)
}