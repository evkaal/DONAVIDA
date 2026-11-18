package handlers

import (
	"donavida-backend/internal/database"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

// ---------------------------------------------------------------------------
// Helpers compartidos por los handlers de unidades / stock / solicitudes.
// ---------------------------------------------------------------------------

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func parseInstID(r *http.Request) int {
	v := r.URL.Query().Get("institucion_id")
	if v == "" {
		return 0
	}
	n, err := strconv.Atoi(v)
	if err != nil || n < 0 {
		return 0
	}
	return n
}

// userIDFromToken decodifica el JWT del header Authorization y resuelve el
// id del usuario por su email. Devuelve 0 si no hay token válido.
func userIDFromToken(r *http.Request) int {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return 0
	}
	tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
	c := &claims{}
	token, err := jwt.ParseWithClaims(tokenStr, c, func(token *jwt.Token) (interface{}, error) {
		return jwtKey, nil
	})
	if err != nil || !token.Valid || c.Email == "" {
		return 0
	}
	var id int
	if err := database.DB.QueryRow(`SELECT id FROM usuarios WHERE email = $1`, c.Email).Scan(&id); err != nil {
		return 0
	}
	return id
}

// splitTipoSangre separa "AB+" en ("AB", "+") y "O-" en ("O", "-").
func splitTipoSangre(tipo string) (string, string) {
	tipo = strings.TrimSpace(tipo)
	if len(tipo) < 2 {
		return tipo, "+"
	}
	return tipo[:len(tipo)-1], tipo[len(tipo)-1:]
}

func resolveTipoSangreID(tipo string) (int, error) {
	abo, rh := splitTipoSangre(tipo)
	var id int
	err := database.DB.QueryRow(`SELECT id FROM tipos_sangre WHERE grupo_abo = $1 AND factor_rh = $2`, abo, rh).Scan(&id)
	return id, err
}

// resolveHemocomponenteID busca por la columna `componente` (no `nombre`).
// Primero intenta coincidencia exacta ILIKE y luego por prefijo, para cubrir
// casos como "Plasma fresco" frente a "Plasma fresco congelado" en el catálogo.
func resolveHemocomponenteID(nombre string) (int, error) {
	var id int
	err := database.DB.QueryRow(`SELECT id FROM tipos_hemocomponente WHERE componente ILIKE $1 ORDER BY LENGTH(componente) ASC LIMIT 1`, nombre).Scan(&id)
	if err == nil {
		return id, nil
	}
	err = database.DB.QueryRow(`SELECT id FROM tipos_hemocomponente WHERE componente ILIKE $1 ORDER BY LENGTH(componente) ASC LIMIT 1`, "%"+nombre+"%").Scan(&id)
	return id, err
}

// resolvePorPatron busca un id en una tabla de catálogo por nombre con ILIKE
// usando un patrón parcial, para tolerar mayúsculas y acentos
// ("critica" encuentra "Crítica", "urgente" encuentra "Urgente", etc.).
func resolvePorPatron(tabla, patron string) (int, error) {
	var id int
	err := database.DB.QueryRow(fmt.Sprintf(`SELECT id FROM %s WHERE nombre ILIKE $1 ORDER BY id LIMIT 1`, tabla), patron).Scan(&id)
	return id, err
}

// ---------------------------------------------------------------------------
// GET /api/unidades?institucion_id=
// ---------------------------------------------------------------------------

type UnidadResponse struct {
	Folio           string `json:"folio"`
	Tipo            string `json:"tipo"`
	Hemocomponente  string `json:"hemocomponente"`
	FechaExtraccion string `json:"fechaExtraccion"`
	FechaCaducidad  string `json:"fechaCaducidad"`
	Estado          string `json:"estado"`
	Institucion     string `json:"institucion"`
}

func GetUnidades(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}
	instID := parseInstID(r)
	rows, err := database.DB.Query(`
		SELECT h.codigo_unidad,
		       ts.grupo_abo || ts.factor_rh AS tipo,
		       th.componente AS hemocomponente,
		       TO_CHAR(h.fecha_extraccion, 'YYYY-MM-DD') AS fecha_extraccion,
		       TO_CHAR(h.fecha_caducidad, 'YYYY-MM-DD') AS fecha_caducidad,
		       eh.nombre AS estado,
		       i.nombre AS institucion
		FROM hemocomponentes h
		JOIN tipos_sangre ts ON h.tipo_sangre_id = ts.id
		JOIN tipos_hemocomponente th ON h.tipo_hemocomponente_id = th.id
		JOIN estados_hemocomponente eh ON h.estado_id = eh.id
		JOIN instituciones i ON h.institucion_id = i.id
		WHERE ($1 = 0 OR h.institucion_id = $1)
		ORDER BY h.fecha_caducidad ASC, h.codigo_unidad ASC
	`, instID)
	if err != nil {
		log.Printf("Error al consultar unidades: %v", err)
		http.Error(w, "Error al obtener unidades", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	unidades := []UnidadResponse{}
	for rows.Next() {
		var u UnidadResponse
		if err := rows.Scan(&u.Folio, &u.Tipo, &u.Hemocomponente, &u.FechaExtraccion, &u.FechaCaducidad, &u.Estado, &u.Institucion); err != nil {
			continue
		}
		unidades = append(unidades, u)
	}
	writeJSON(w, http.StatusOK, unidades)
}

// ---------------------------------------------------------------------------
// GET /api/stock?institucion_id=
// ---------------------------------------------------------------------------

type celdaStock struct {
	Cant   int    `json:"cant"`
	Min    int    `json:"min"`
	Estado string `json:"estado"`
}

type filaMatriz struct {
	Tipo              string     `json:"tipo"`
	SangreTotal       celdaStock `json:"sangreTotal"`
	ConcEritrocitario celdaStock `json:"concEritrocitario"`
	PlasmaFresco      celdaStock `json:"plasmaFresco"`
	Plaquetas         celdaStock `json:"plaquetas"`
	Total             int        `json:"total"`
}

type alertaStock struct {
	ID          int    `json:"id"`
	TipoAlerta  string `json:"tipoAlerta"`
	Titulo      string `json:"titulo"`
	Descripcion string `json:"descripcion"`
	Tiempo      string `json:"tiempo"`
}

type unidadCaducar struct {
	Codigo           string `json:"codigo"`
	Tipo             string `json:"tipo"`
	Hemocomponente   string `json:"hemocomponente"`
	FechaExtraccion  string `json:"fechaExtraccion"`
	FechaCaducidad   string `json:"fechaCaducidad"`
	VigenciaRestante string `json:"vigenciaRestante"`
}

var ordenTiposSangre = []string{"A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"}

// columnaHemo clasifica un componente del catálogo en una de las 4 columnas
// de la matriz. Devuelve "" si no pertenece a ninguna.
func columnaHemo(componente string) string {
	c := strings.ToLower(componente)
	switch {
	case strings.Contains(c, "sangre total"):
		return "sangreTotal"
	case strings.Contains(c, "eritrocitario") || strings.Contains(c, "eritrocito"):
		return "concEritrocitario"
	case strings.Contains(c, "plasma"):
		return "plasmaFresco"
	case strings.Contains(c, "plaqueta"):
		return "plaquetas"
	default:
		return ""
	}
}

func GetStock(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}
	instID := parseInstID(r)
	const diasCaducidad = 7

	// 1. Tipos de sangre (orden fijo A+, A-, B+, B-, AB+, AB-, O+, O-)
	tipoIDs := map[string]int{}
	rows, err := database.DB.Query(`SELECT id, grupo_abo || factor_rh AS tipo FROM tipos_sangre`)
	if err != nil {
		http.Error(w, "Error al consultar tipos de sangre", http.StatusInternalServerError)
		return
	}
	for rows.Next() {
		var id int
		var tipo string
		if err := rows.Scan(&id, &tipo); err == nil {
			tipoIDs[tipo] = id
		}
	}
	rows.Close()

	// 2. Umbrales: si hay institución, los suyos; si no, el mínimo entre todas
	// las instituciones para esa celda (5 por defecto si no hay registro).
	umbrales := map[string]int{} // "tipoID:hemoID" -> min
	urows, err := database.DB.Query(`
		SELECT tipo_sangre_id, tipo_hemocomponente_id, MIN(stock_minimo)
		FROM umbrales_stock
		WHERE ($1 = 0 OR institucion_id = $1)
		GROUP BY tipo_sangre_id, tipo_hemocomponente_id
	`, instID)
	if err == nil {
		for urows.Next() {
			var tsID, thID, min int
			if err := urows.Scan(&tsID, &thID, &min); err == nil {
				umbrales[fmt.Sprintf("%d:%d", tsID, thID)] = min
			}
		}
		urows.Close()
	}

	// 3. Conteo de unidades disponibles por (tipo_sangre, hemocomponente).
	conteos := map[string]int{} // "tipo:claveColumna" -> cantidad
	hemoIDs := map[string]int{} // claveColumna -> un id de hemocomponente (para el umbral)
	crows, err := database.DB.Query(`
		SELECT ts.grupo_abo || ts.factor_rh AS tipo, th.id AS hemo_id, th.componente,
		       COUNT(h.id) AS cantidad
		FROM tipos_sangre ts
		CROSS JOIN tipos_hemocomponente th
		LEFT JOIN hemocomponentes h
		  ON h.tipo_sangre_id = ts.id
		 AND h.tipo_hemocomponente_id = th.id
		 AND ($1 = 0 OR h.institucion_id = $1)
		 AND EXISTS (SELECT 1 FROM estados_hemocomponente eh WHERE eh.id = h.estado_id AND eh.nombre ILIKE 'disponible')
		GROUP BY ts.grupo_abo, ts.factor_rh, th.id, th.componente
	`, instID)
	if err != nil {
		log.Printf("Error al consultar stock: %v", err)
		http.Error(w, "Error al obtener stock", http.StatusInternalServerError)
		return
	}
	for crows.Next() {
		var tipo string
		var hemoID, cantidad int
		var componente string
		if err := crows.Scan(&tipo, &hemoID, &componente, &cantidad); err != nil {
			continue
		}
		col := columnaHemo(componente)
		if col == "" {
			continue
		}
		conteos[tipo+":"+col] += cantidad
		hemoIDs[tipo+":"+col] = hemoID
	}
	crows.Close()

	// 4. Matriz 8 x 4 + KPIs + alertas de stock.
	matriz := []filaMatriz{}
	totales := map[string]int{"sangreTotal": 0, "concEritrocitario": 0, "plasmaFresco": 0, "plaquetas": 0, "granTotal": 0}
	cols := []string{"sangreTotal", "concEritrocitario", "plasmaFresco", "plaquetas"}
	var unidadesDisponibles, tiposConExistencia, bajoMinimo, sinExistencias int
	var detalleSin []string
	alertas := []alertaStock{}
	alertaID := 1
	tiposConStock := map[string]bool{}
	for _, tipo := range ordenTiposSangre {
		fila := filaMatriz{Tipo: tipo}
		celdas := map[string]*celdaStock{
			"sangreTotal":       &fila.SangreTotal,
			"concEritrocitario": &fila.ConcEritrocitario,
			"plasmaFresco":      &fila.PlasmaFresco,
			"plaquetas":         &fila.Plaquetas,
		}
		for _, col := range cols {
			cant := conteos[tipo+":"+col]
			min := 5
			if tsID, ok := tipoIDs[tipo]; ok {
				if hemoID, ok2 := hemoIDs[tipo+":"+col]; ok2 {
					if m, ok3 := umbrales[fmt.Sprintf("%d:%d", tsID, hemoID)]; ok3 {
						min = m
					}
				}
			}
			estado := "normal"
			switch {
			case cant == 0:
				estado = "sin_existencia"
			case cant <= min:
				estado = "bajo"
			}
			*celdas[col] = celdaStock{Cant: cant, Min: min, Estado: estado}
			fila.Total += cant
			totales[col] += cant
			totales["granTotal"] += cant
			unidadesDisponibles += cant
			if cant > 0 {
				tiposConStock[tipo] = true
			}
			if estado == "bajo" {
				bajoMinimo++
				alertas = append(alertas, alertaStock{
					ID: alertaID, TipoAlerta: "advertencia",
					Titulo:      fmt.Sprintf("%s · %s bajo el mínimo", tipo, nombreColumna(col)),
					Descripcion: fmt.Sprintf("Quedan %d unidades (mínimo %d).", cant, min),
					Tiempo:      "Ahora",
				})
				alertaID++
			}
			if estado == "sin_existencia" {
				sinExistencias++
				detalleSin = append(detalleSin, fmt.Sprintf("%s · %s", tipo, nombreColumna(col)))
				alertas = append(alertas, alertaStock{
					ID: alertaID, TipoAlerta: "critica",
					Titulo:      fmt.Sprintf("%s · %s sin existencias", tipo, nombreColumna(col)),
					Descripcion: "No hay unidades disponibles de esta combinación.",
					Tiempo:      "Ahora",
				})
				alertaID++
			}
		}
		matriz = append(matriz, fila)
	}
	tiposConExistencia = len(tiposConStock)
	detalleSinExistencias := "Sin incidencias"
	if len(detalleSin) > 0 {
		detalleSinExistencias = strings.Join(detalleSin, ", ")
	}

	// 5. Próximas a caducar (disponibles, caducidad en los próximos 7 días).
	proximas := []unidadCaducar{}
	prows, err := database.DB.Query(`
		SELECT h.codigo_unidad,
		       ts.grupo_abo || ts.factor_rh AS tipo,
		       th.componente AS hemocomponente,
		       TO_CHAR(h.fecha_extraccion, 'YYYY-MM-DD') AS fecha_extraccion,
		       TO_CHAR(h.fecha_caducidad, 'YYYY-MM-DD') AS fecha_caducidad,
		       (h.fecha_caducidad - CURRENT_DATE) AS dias_restantes
		FROM hemocomponentes h
		JOIN tipos_sangre ts ON h.tipo_sangre_id = ts.id
		JOIN tipos_hemocomponente th ON h.tipo_hemocomponente_id = th.id
		JOIN estados_hemocomponente eh ON h.estado_id = eh.id AND eh.nombre ILIKE 'disponible'
		WHERE h.fecha_caducidad BETWEEN CURRENT_DATE AND CURRENT_DATE + ($1 || ' days')::interval
		  AND ($2 = 0 OR h.institucion_id = $2)
		ORDER BY h.fecha_caducidad ASC
	`, diasCaducidad, instID)
	if err == nil {
		for prows.Next() {
			var u unidadCaducar
			var dias int
			if err := prows.Scan(&u.Codigo, &u.Tipo, &u.Hemocomponente, &u.FechaExtraccion, &u.FechaCaducidad, &dias); err != nil {
				continue
			}
			switch {
			case dias <= 0:
				u.VigenciaRestante = "Hoy"
			case dias == 1:
				u.VigenciaRestante = "1 día"
			default:
				u.VigenciaRestante = fmt.Sprintf("%d días", dias)
			}
			proximas = append(proximas, u)
			alertas = append(alertas, alertaStock{
				ID: alertaID, TipoAlerta: "caducidad",
				Titulo:      fmt.Sprintf("Unidad %s por caducar", u.Codigo),
				Descripcion: fmt.Sprintf("%s · %s caduca el %s.", u.Tipo, u.Hemocomponente, u.FechaCaducidad),
				Tiempo:      u.VigenciaRestante,
			})
			alertaID++
		}
		prows.Close()
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"kpis": map[string]interface{}{
			"unidadesDisponibles":   unidadesDisponibles,
			"tiposConExistencia":    tiposConExistencia,
			"bajoMinimo":            bajoMinimo,
			"totalCombinaciones":    len(ordenTiposSangre) * len(cols),
			"sinExistencias":        sinExistencias,
			"detalleSinExistencias": detalleSinExistencias,
			"porCaducar":            len(proximas),
			"diasCaducidad":         diasCaducidad,
		},
		"matriz": matriz,
		"totalesColumnas": map[string]int{
			"sangreTotal":       totales["sangreTotal"],
			"concEritrocitario": totales["concEritrocitario"],
			"plasmaFresco":      totales["plasmaFresco"],
			"plaquetas":         totales["plaquetas"],
			"granTotal":         totales["granTotal"],
		},
		"alertas":         alertas,
		"proximasCaducar": proximas,
	})
}

func nombreColumna(col string) string {
	switch col {
	case "sangreTotal":
		return "Sangre total"
	case "concEritrocitario":
		return "Conc. eritrocitario"
	case "plasmaFresco":
		return "Plasma fresco"
	case "plaquetas":
		return "Plaquetas"
	default:
		return col
	}
}

// ---------------------------------------------------------------------------
// POST /api/solicitudes
// ---------------------------------------------------------------------------

type solicitudUnidadInput struct {
	Tipo           string `json:"tipo"`
	Hemocomponente string `json:"hemocomponente"`
	Cantidad       int    `json:"cantidad"`
}

type crearSolicitudInput struct {
	InstitucionID int                    `json:"institucion_id"`
	Prioridad     string                 `json:"prioridad"`
	Motivo        string                 `json:"motivo"`
	Unidades      []solicitudUnidadInput `json:"unidades"`
}

func CrearSolicitud(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}
	var input crearSolicitudInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Error al leer los datos de la solicitud", http.StatusBadRequest)
		return
	}
	if input.InstitucionID <= 0 {
		http.Error(w, "institucion_id es obligatorio", http.StatusBadRequest)
		return
	}
	if len(input.Unidades) == 0 {
		http.Error(w, "La solicitud debe incluir al menos una unidad", http.StatusBadRequest)
		return
	}

	prioridad := strings.ToLower(strings.TrimSpace(input.Prioridad))
	patronPrioridad := map[string]string{
		"critica": "%crit%", "crítica": "%crit%",
		"urgente": "%urgent%",
		"normal":  "%normal%",
	}[prioridad]
	if patronPrioridad == "" {
		patronPrioridad = "%normal%"
	}
	prioridadID, err := resolvePorPatron("niveles_prioridad", patronPrioridad)
	if err != nil {
		http.Error(w, "Nivel de prioridad no válido en la base de datos", http.StatusBadRequest)
		return
	}
	estadoID, err := resolvePorPatron("estados_solicitud", "%pendient%")
	if err != nil {
		http.Error(w, "Estado 'pendiente' no encontrado en estados_solicitud", http.StatusBadRequest)
		return
	}

	// Usuario solicitante: del JWT si viene; si no, 1 como fallback
	// (el usuario admin general sembrado). Documentado: en producción el
	// frontend siempre envía el token, así que el fallback solo cubre
	// llamadas sin sesión.
	usuarioID := userIDFromToken(r)
	if usuarioID == 0 {
		usuarioID = 1
	}

	tx, err := database.DB.Begin()
	if err != nil {
		http.Error(w, "Error al iniciar la transacción", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	var solicitudID int
	err = tx.QueryRow(`
		INSERT INTO solicitudes_emergencia
		  (institucion_solicitante_id, usuario_solicitante_id, prioridad_id, estado_id, motivo)
		VALUES ($1, $2, $3, $4, $5) RETURNING id
	`, input.InstitucionID, usuarioID, prioridadID, estadoID, input.Motivo).Scan(&solicitudID)
	if err != nil {
		log.Printf("Error al crear solicitud: %v", err)
		http.Error(w, "Error al crear la solicitud: "+err.Error(), http.StatusInternalServerError)
		return
	}

	for _, u := range input.Unidades {
		if u.Cantidad <= 0 {
			http.Error(w, "La cantidad de cada unidad debe ser mayor a 0", http.StatusBadRequest)
			return
		}
		tipoID, err := resolveTipoSangreID(u.Tipo)
		if err != nil {
			http.Error(w, "Tipo sanguíneo no válido: "+u.Tipo, http.StatusBadRequest)
			return
		}
		hemoID, err := resolveHemocomponenteID(u.Hemocomponente)
		if err != nil {
			http.Error(w, "Hemocomponente no válido: "+u.Hemocomponente, http.StatusBadRequest)
			return
		}
		if _, err := tx.Exec(`
			INSERT INTO solicitud_detalles (solicitud_id, tipo_sangre_id, tipo_hemocomponente_id, cantidad)
			VALUES ($1, $2, $3, $4)
		`, solicitudID, tipoID, hemoID, u.Cantidad); err != nil {
			log.Printf("Error al insertar detalle de solicitud: %v", err)
			http.Error(w, "Error al guardar el detalle de la solicitud", http.StatusInternalServerError)
			return
		}
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, "Error al confirmar la solicitud", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"mensaje": "Solicitud creada con éxito",
		"id":      solicitudID,
	})
}

// ---------------------------------------------------------------------------
// GET /api/solicitudes/entrantes?institucion_id=
// ---------------------------------------------------------------------------

type unidadEntrante struct {
	Tipo            string   `json:"tipo"`
	Hemocomponente  string   `json:"hemocomponente"`
	Cantidad        int      `json:"cantidad"`
	Disponibles     int      `json:"disponibles"`
	FoliosSugeridos []string `json:"foliosSugeridos"`
}

type solicitudEntrante struct {
	ID             string           `json:"id"`
	Institucion    string           `json:"institucion"`
	Solicitante    string           `json:"solicitante"`
	Telefono       string           `json:"telefono"`
	Prioridad      string           `json:"prioridad"`
	Motivo         string           `json:"motivo"`
	Estado         string           `json:"estado"`
	FechaSolicitud string           `json:"fechaSolicitud"`
	FechaCompleta  string           `json:"fechaCompleta"`
	TotalUnidades  int              `json:"totalUnidades"`
	Unidades       []unidadEntrante `json:"unidades"`
}

// foliosDisponibles devuelve los códigos de unidades disponibles de la
// institución propia con ese tipo+hemocomponente, ordenados por caducidad.
func foliosDisponibles(instID, tipoID, hemoID, cantidad int) ([]string, int) {
	folios := []string{}
	if instID <= 0 {
		return folios, 0
	}
	rows, err := database.DB.Query(`
		SELECT h.codigo_unidad
		FROM hemocomponentes h
		JOIN estados_hemocomponente eh ON h.estado_id = eh.id AND eh.nombre ILIKE 'disponible'
		WHERE h.institucion_id = $1 AND h.tipo_sangre_id = $2 AND h.tipo_hemocomponente_id = $3
		ORDER BY h.fecha_caducidad ASC
	`, instID, tipoID, hemoID)
	if err != nil {
		return folios, 0
	}
	defer rows.Close()
	for rows.Next() {
		var codigo string
		if err := rows.Scan(&codigo); err == nil {
			folios = append(folios, codigo)
		}
	}
	total := len(folios)
	if len(folios) > cantidad {
		folios = folios[:cantidad]
	}
	return folios, total
}

func GetSolicitudesEntrantes(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}
	instID := parseInstID(r)
	rows, err := database.DB.Query(`
		SELECT s.id, i.nombre AS institucion, u.nombre AS solicitante,
		       COALESCE(i.telefono, '') AS telefono,
		       LOWER(np.nombre) AS prioridad, COALESCE(s.motivo, '') AS motivo,
		       LOWER(es.nombre) AS estado,
		       TO_CHAR(s.fecha_solicitud, 'DD Mon · HH24:MI') AS fecha_solicitud,
		       TO_CHAR(s.fecha_solicitud, 'DD Mon YYYY · HH24:MI') AS fecha_completa
		FROM solicitudes_emergencia s
		JOIN instituciones i ON s.institucion_solicitante_id = i.id
		JOIN usuarios u ON s.usuario_solicitante_id = u.id
		JOIN niveles_prioridad np ON s.prioridad_id = np.id
		JOIN estados_solicitud es ON s.estado_id = es.id
		WHERE ($1 = 0 OR s.institucion_solicitante_id <> $1)
		ORDER BY s.fecha_solicitud DESC
	`, instID)
	if err != nil {
		log.Printf("Error al consultar solicitudes entrantes: %v", err)
		http.Error(w, "Error al obtener solicitudes entrantes", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	solicitudes := []solicitudEntrante{}
	for rows.Next() {
		var s solicitudEntrante
		var numID int
		if err := rows.Scan(&numID, &s.Institucion, &s.Solicitante, &s.Telefono, &s.Prioridad, &s.Motivo, &s.Estado, &s.FechaSolicitud, &s.FechaCompleta); err != nil {
			continue
		}
		s.ID = fmt.Sprintf("SOL-%04d", numID)

		// Detalles con disponibilidad propia.
		drows, err := database.DB.Query(`
			SELECT sd.tipo_sangre_id, sd.tipo_hemocomponente_id,
			       ts.grupo_abo || ts.factor_rh AS tipo, th.componente AS hemocomponente,
			       sd.cantidad
			FROM solicitud_detalles sd
			JOIN tipos_sangre ts ON sd.tipo_sangre_id = ts.id
			JOIN tipos_hemocomponente th ON sd.tipo_hemocomponente_id = th.id
			WHERE sd.solicitud_id = $1
		`, numID)
		if err != nil {
			continue
		}
		s.Unidades = []unidadEntrante{}
		for drows.Next() {
			var u unidadEntrante
			var tipoID, hemoID int
			if err := drows.Scan(&tipoID, &hemoID, &u.Tipo, &u.Hemocomponente, &u.Cantidad); err != nil {
				continue
			}
			folios, disp := foliosDisponibles(instID, tipoID, hemoID, u.Cantidad)
			u.Disponibles = disp
			u.FoliosSugeridos = folios
			s.Unidades = append(s.Unidades, u)
			s.TotalUnidades += u.Cantidad
		}
		drows.Close()
		solicitudes = append(solicitudes, s)
	}
	writeJSON(w, http.StatusOK, solicitudes)
}

// ---------------------------------------------------------------------------
// POST /api/solicitudes/entrantes/{id}/aceptar | /rechazar
// ---------------------------------------------------------------------------

func ResponderSolicitud(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}
	// Ruta: /api/solicitudes/entrantes/SOL-0001/aceptar (o id numérico).
	rest := strings.TrimPrefix(r.URL.Path, "/api/solicitudes/entrantes/")
	parts := strings.Split(strings.Trim(rest, "/"), "/")
	if len(parts) != 2 {
		http.Error(w, "Ruta inválida: se espera /api/solicitudes/entrantes/{id}/aceptar o /rechazar", http.StatusBadRequest)
		return
	}
	idStr := strings.TrimPrefix(strings.ToUpper(parts[0]), "SOL-")
	numID, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "ID de solicitud inválido", http.StatusBadRequest)
		return
	}
	accion := strings.ToLower(parts[1])
	var estadoNombre, patron string
	switch accion {
	case "aceptar":
		estadoNombre, patron = "aceptada", "%acept%"
	case "rechazar":
		estadoNombre, patron = "rechazada", "%rechaz%"
	default:
		http.Error(w, "Acción inválida: usa aceptar o rechazar", http.StatusBadRequest)
		return
	}
	estadoID, err := resolvePorPatron("estados_solicitud", patron)
	if err != nil {
		// No se crea el estado: si no está sembrado en la BD, el admin debe
		// sembrarlo (ver README-DEPLOY / reporte de entrega).
		http.Error(w, "Estado '"+estadoNombre+"' no existe en estados_solicitud; pídele al administrador que siembre ese estado en la base de datos", http.StatusBadRequest)
		return
	}
	res, err := database.DB.Exec(`
		UPDATE solicitudes_emergencia SET estado_id = $1, fecha_cierre = NOW() WHERE id = $2
	`, estadoID, numID)
	if err != nil {
		http.Error(w, "Error al responder la solicitud", http.StatusInternalServerError)
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		http.Error(w, "Solicitud no encontrada", http.StatusNotFound)
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"mensaje": "Solicitud " + estadoNombre + " con éxito",
		"id":      numID,
		"estado":  estadoNombre,
	})
}

// ---------------------------------------------------------------------------
// GET /api/solicitudes/historico?institucion_id=&tipo=&estado=
// ---------------------------------------------------------------------------

type solicitudHistorico struct {
	ID          string `json:"id"`
	Tipo        string `json:"tipo"`
	Institucion string `json:"institucion"`
	Prioridad   string `json:"prioridad"`
	Unidades    int    `json:"unidades"`
	Solicitada  string `json:"solicitada"`
	Cerrada     string `json:"cerrada"`
	Estado      string `json:"estado"`
}

func GetHistorico(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}
	instID := parseInstID(r)
	tipoFiltro := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("tipo")))
	estadoFiltro := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("estado")))

	// Histórico = todas las solicitudes. El tipo es 'enviada' cuando la
	// institución del parámetro es la solicitante y 'recibida' en caso
	// contrario, así que no se filtra por institución en el WHERE.
	// Regla para admin general (institucion_id = 0, sin institución propia):
	// el tipo se calcula por el TIPO de la institución solicitante:
	// 'enviada' si tipos_institucion.nombre es hospital o clínica
	// (los hospitales/clínicas son quienes envían solicitudes),
	// 'recibida' si es banco de sangre (los bancos las reciben).
	rows, err := database.DB.Query(`
		SELECT s.id, i.nombre AS institucion,
		       LOWER(np.nombre) AS prioridad,
		       COALESCE(SUM(sd.cantidad), 0) AS unidades,
		       TO_CHAR(s.fecha_solicitud, 'DD Mon · HH24:MI') AS solicitada,
		       COALESCE(TO_CHAR(s.fecha_cierre, 'DD Mon · HH24:MI'), '') AS cerrada,
		       LOWER(es.nombre) AS estado,
		       CASE
		         WHEN $1 <> 0 AND s.institucion_solicitante_id = $1 THEN 'enviada'
		         WHEN $1 <> 0 THEN 'recibida'
		         WHEN ti.nombre ILIKE '%banco%' THEN 'recibida'
		         WHEN ti.nombre ILIKE '%hospital%' OR ti.nombre ILIKE '%clinica%' OR ti.nombre ILIKE '%clínica%' THEN 'enviada'
		         ELSE 'recibida'
		       END AS tipo
		FROM solicitudes_emergencia s
		JOIN instituciones i ON s.institucion_solicitante_id = i.id
		JOIN tipos_institucion ti ON i.tipo_institucion_id = ti.id
		JOIN niveles_prioridad np ON s.prioridad_id = np.id
		JOIN estados_solicitud es ON s.estado_id = es.id
		LEFT JOIN solicitud_detalles sd ON sd.solicitud_id = s.id
		GROUP BY s.id, i.nombre, ti.nombre, np.nombre, s.fecha_solicitud, s.fecha_cierre, es.nombre, s.institucion_solicitante_id
		ORDER BY s.fecha_solicitud DESC
	`, instID)
	if err != nil {
		log.Printf("Error al consultar histórico: %v", err)
		http.Error(w, "Error al obtener el histórico", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	solicitudes := []solicitudHistorico{}
	conteos := map[string]int{"todas": 0, "enviadas": 0, "recibidas": 0}
	for rows.Next() {
		var s solicitudHistorico
		var numID int
		if err := rows.Scan(&numID, &s.Institucion, &s.Prioridad, &s.Unidades, &s.Solicitada, &s.Cerrada, &s.Estado, &s.Tipo); err != nil {
			continue
		}
		s.ID = fmt.Sprintf("SOL-%04d", numID)
		// Conteos sobre todo el histórico de la institución (sin filtros).
		conteos["todas"]++
		if s.Tipo == "enviada" {
			conteos["enviadas"]++
		} else {
			conteos["recibidas"]++
		}
		// Filtros opcionales por tipo / estado.
		if tipoFiltro != "" && tipoFiltro != "todas" {
			t := tipoFiltro
			if t == "enviadas" {
				t = "enviada"
			}
			if t == "recibidas" {
				t = "recibida"
			}
			if s.Tipo != t {
				continue
			}
		}
		if estadoFiltro != "" && estadoFiltro != "todos" {
			if !strings.Contains(s.Estado, estadoFiltro) {
				continue
			}
		}
		solicitudes = append(solicitudes, s)
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"total":       len(solicitudes),
		"conteos":     conteos,
		"solicitudes": solicitudes,
	})
}

// GetStockPorInstitucion: alias de GetStock (la versión anterior consultaba
// la tabla inexistente stock_inventario y nunca devolvía JSON).
func GetStockPorInstitucion(w http.ResponseWriter, r *http.Request) {
	GetStock(w, r)
}
