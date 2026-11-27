package handlers

import (
	"donavida-backend/internal/database"
	"database/sql"
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

// sesionUsuario resume lo que el backend necesita saber del usuario
// logueado: su id, su rol y su institución. Se resuelve desde la BD por el
// email del token (no por claims), para que los tokens ya emitidos sigan
// funcionando.
//
// Dos tablas de identidad: la web (`usuarios`) y la app móvil
// (`usuarios_moviles`, migración 000005). El JWT solo lleva email + rol,
// así que la sesión se busca primero en `usuarios` (si el rol del token
// coincide con el de esa fila) y si no, en `usuarios_moviles`.
// EsMovil es true solo cuando la sesión salió de la tabla móvil: su id
// es un id de `usuarios_moviles` (no de `usuarios`) y no tiene
// institución. Los endpoints de la app exigen EsMovil; los de la web,
// que no lo exigen, ven a un móvil como un usuario sin institución
// (institucionParaConsulta devuelve -1: listas vacías).
type sesionUsuario struct {
	ID            int
	RolID         int
	InstitucionID *int
	Email         string
	EsMovil       bool
}

func sesionDesdeToken(r *http.Request) (sesionUsuario, bool) {
	var s sesionUsuario
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return s, false
	}
	tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
	c := &claims{}
	token, err := jwt.ParseWithClaims(tokenStr, c, func(token *jwt.Token) (interface{}, error) {
		return jwtKey, nil
	})
	if err != nil || !token.Valid || c.Email == "" {
		return s, false
	}
	// 1. Tabla web. El rol de la fila debe coincidir con el del token:
	// si el mismo correo existe en las dos tablas (duplicado anterior
	// a la regla de unicidad cruzada), el token manda y se sigue a la
	// tabla móvil.
	var instID sql.NullInt64
	var rolFila int
	err = database.DB.QueryRow(`SELECT id, rol_id, institucion_id FROM usuarios WHERE email = $1`, c.Email).Scan(&s.ID, &rolFila, &instID)
	if err == nil && rolFila == c.RolID {
		s.RolID = rolFila
		if instID.Valid {
			v := int(instID.Int64)
			s.InstitucionID = &v
		}
		s.Email = c.Email
		return s, true
	}
	// 2. Tabla móvil.
	var rolMovil int
	err = database.DB.QueryRow(`SELECT id, COALESCE(rol_id, 0) FROM usuarios_moviles WHERE correo = $1`, c.Email).Scan(&s.ID, &rolMovil)
	if err != nil || rolMovil != c.RolID {
		return sesionUsuario{}, false
	}
	s.RolID = rolMovil
	s.Email = c.Email
	s.EsMovil = true
	return s, true
}

// institucionParaConsulta resuelve a qué institución se limitan las
// consultas de listado:
//   - admin general (rol_id 1): respeta ?institucion_id= (0 o ausente = todas).
//   - rol 2/3: siempre su propia institución del JWT; el query param se ignora.
//   - sin sesión o sin institución: -1 (ninguna). El llamador debe devolver
//     lista vacía y nunca todas las instituciones.
func institucionParaConsulta(r *http.Request) int {
	sesion, ok := sesionDesdeToken(r)
	if !ok {
		return -1
	}
	if sesion.RolID == 1 {
		return parseInstID(r)
	}
	if sesion.InstitucionID == nil {
		return -1
	}
	return *sesion.InstitucionID
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

// normalizarNombre deja un nombre de catálogo en forma comparable:
// minúsculas, sin acentos, sin espacios de más. Así "Plasma fresco",
// "PLASMA FRESCO" y "plasma fresco congelado" se pueden comparar sin
// depender de cómo lo haya sembrado el equipo en la BD.
var acentosReplacer = strings.NewReplacer(
	"á", "a", "à", "a", "ä", "a", "â", "a",
	"é", "e", "è", "e", "ë", "e", "ê", "e",
	"í", "i", "ì", "i", "ï", "i", "î", "i",
	"ó", "o", "ò", "o", "ö", "o", "ô", "o",
	"ú", "u", "ù", "u", "ü", "u", "û", "u",
	"ñ", "n", "ç", "c",
)

func normalizarNombre(s string) string {
	s = acentosReplacer.Replace(strings.ToLower(strings.TrimSpace(s)))
	return strings.Join(strings.Fields(s), " ")
}

// resolveHemocomponenteID busca por la columna `componente` (no `nombre`),
// tolerando que el nombre que manda el frontend no sea idéntico al
// sembrado en la BD. Orden: (a) coincidencia exacta normalizada;
// (b) substring en ambas direcciones ("Plasma fresco" frente a
// "Plasma fresco congelado" y viceversa); (c) por palabra clave
// (eritroc / plasma / plaquet / sangre / crioprecip). Devuelve error
// solo si nada coincide.
func resolveHemocomponenteID(nombre string) (int, error) {
	buscado := normalizarNombre(nombre)
	if buscado == "" {
		return 0, fmt.Errorf("hemocomponente vacío")
	}
	rows, err := database.DB.Query(`SELECT id, componente FROM tipos_hemocomponente`)
	if err != nil {
		return 0, err
	}
	defer rows.Close()
	type hemo struct {
		id         int
		componente string
		norm       string
	}
	var catalogo []hemo
	for rows.Next() {
		var h hemo
		if err := rows.Scan(&h.id, &h.componente); err != nil {
			continue
		}
		h.norm = normalizarNombre(h.componente)
		catalogo = append(catalogo, h)
	}
	if err := rows.Err(); err != nil {
		return 0, err
	}
	// (a) coincidencia exacta normalizada.
	for _, h := range catalogo {
		if h.norm == buscado {
			return h.id, nil
		}
	}
	// (b) substring en ambas direcciones.
	for _, h := range catalogo {
		if strings.Contains(h.norm, buscado) || strings.Contains(buscado, h.norm) {
			return h.id, nil
		}
	}
	// (c) por palabra clave. "globular" es un paquete globular, es decir,
	// eritrocitos concentrados, y se resuelve al componente que lo contenga.
	for _, clave := range []string{"eritroc", "crioprecip", "plaquet", "plasma", "sangre", "globular"} {
		if strings.Contains(buscado, clave) {
			for _, h := range catalogo {
				if strings.Contains(h.norm, clave) {
					return h.id, nil
				}
			}
		}
	}
	return 0, fmt.Errorf("hemocomponente no encontrado: %s", nombre)
}

// resolvePorPatron busca un id en una tabla de catálogo por nombre,
// tolerando mayúsculas, acentos y sufijos. Postgres ILIKE es insensible
// a mayúsculas pero SENSIBLE a acentos ("%crit%" no casa con "Crítica"),
// así que la comparación se hace en Go con normalizarNombre: (a) primero
// coincidencia exacta normalizada; (b) si no hay, substring normalizado
// en ambas direcciones. El `patron` llega como patrón LIKE con `%`
// (ej. "%crit%"): se le quitan los `%` y se normaliza antes de comparar.
// Devuelve el id menor entre los que casen (las filas se leen ordenadas
// por id). Si nada casa, devuelve sql.ErrNoRows para que el llamador
// siga devolviendo su 400 con mensaje claro.
// Solo se aceptan las tablas de catálogo que usan los llamadores;
// el nombre de tabla nunca viene del usuario (solo literales).
func resolvePorPatron(tabla, patron string) (int, error) {
	if tabla != "niveles_prioridad" && tabla != "estados_solicitud" && tabla != "estados_hemocomponente" {
		return 0, fmt.Errorf("tabla de catálogo no permitida: %s", tabla)
	}
	buscado := normalizarNombre(strings.ReplaceAll(patron, "%", ""))
	if buscado == "" {
		return 0, sql.ErrNoRows
	}
	rows, err := database.DB.Query(fmt.Sprintf(`SELECT id, nombre FROM %s ORDER BY id`, tabla))
	if err != nil {
		return 0, err
	}
	defer rows.Close()
	// (a) coincidencia exacta normalizada (id menor primero).
	var candidatos []struct {
		id   int
		norm string
	}
	for rows.Next() {
		var c struct {
			id   int
			norm string
		}
		var nombre string
		if err := rows.Scan(&c.id, &nombre); err != nil {
			continue
		}
		c.norm = normalizarNombre(nombre)
		candidatos = append(candidatos, c)
	}
	if err := rows.Err(); err != nil {
		return 0, err
	}
	for _, c := range candidatos {
		if c.norm == buscado {
			return c.id, nil
		}
	}
	// (b) substring normalizado en ambas direcciones: "%crit%" casa con
	// "Crítica" (critica), "%pendient%" con "Pendiente", "%acept%" con
	// "Aceptada", "%rechaz%" con "Rechazada", "%normal%" con "Normal".
	for _, c := range candidatos {
		if strings.Contains(c.norm, buscado) || strings.Contains(buscado, c.norm) {
			return c.id, nil
		}
	}
	return 0, sql.ErrNoRows
}

// ---------------------------------------------------------------------------
// GET /api/unidades?institucion_id=
// ---------------------------------------------------------------------------

type UnidadResponse struct {
	ID              int    `json:"id"`
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
	// La institución se resuelve desde el JWT (ver institucionParaConsulta):
	// un admin_institucion solo ve las unidades de su institución y un
	// usuario sin institución ve lista vacía, nunca todas.
	instID := institucionParaConsulta(r)
	if instID == -1 {
		writeJSON(w, http.StatusOK, []UnidadResponse{})
		return
	}
	rows, err := database.DB.Query(`
		SELECT h.id,
		       h.codigo_unidad,
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
		if err := rows.Scan(&u.ID, &u.Folio, &u.Tipo, &u.Hemocomponente, &u.FechaExtraccion, &u.FechaCaducidad, &u.Estado, &u.Institucion); err != nil {
			continue
		}
		unidades = append(unidades, u)
	}
	writeJSON(w, http.StatusOK, unidades)
}

// ---------------------------------------------------------------------------
// Definición ÚNICA de "nivel crítico" de stock (Dashboard, Stock y gráfica).
// ---------------------------------------------------------------------------
// El dominio son 32 celdas: 8 tipos de sangre × 4 columnas de la matriz
// (Sangre total, Concentrado eritrocitario, Plasma fresco, Plaquetas).
// "Paquete globular" es el mismo producto que el concentrado eritrocitario,
// así que sus unidades se suman en la misma columna (ver columnaHemo).
// Antes el KPI del Dashboard contaba 8 × 5 tipos de hemocomponente (40
// combinaciones) y llegaba a 39, imposible sobre el máximo real de 32.
//
// Para cada celda: cant = unidades Disponibles del ámbito; min = mínimo de
// umbrales_stock para esa combinación (5 por defecto si no hay fila; si la
// columna agrupa dos tipos de hemocomponente se toma el menor mínimo de
// ambos). Estados: "sin_existencia" (cant == 0), "bajo" (0 < cant <= min),
// "normal" (cant > min). "Crítico" = bajo + sin existencias.
// El ámbito es el mismo en los tres sitios (institucionParaConsulta):
// admin general (instID 0) ve toda la red; rol 2/3 solo su institución.
// Sin institución (instID -1) no se cuenta nada: los conteos quedan en 0,
// igual que el resto de KPIs del Dashboard para ese caso.
type celdaCritica struct {
	Tipo   string
	Col    string // sangreTotal | concEritrocitario | plasmaFresco | plaquetas
	Cant   int
	Min    int
	Estado string // "normal" | "bajo" | "sin_existencia"
}

var columnasStock = []string{"sangreTotal", "concEritrocitario", "plasmaFresco", "plaquetas"}

// celdasCriticas calcula las 32 celdas de stock para el ámbito dado.
// Devuelve las celdas en orden fijo (tipo, columna) y los conteos
// bajoMinimo (0 < cant <= min) y sinExistencias (cant == 0).
func celdasCriticas(instID int) ([]celdaCritica, int, int, error) {
	celdas := map[string]*celdaCritica{}
	for _, tipo := range ordenTiposSangre {
		for _, col := range columnasStock {
			celdas[tipo+":"+col] = &celdaCritica{Tipo: tipo, Col: col, Min: 5, Estado: "sin_existencia"}
		}
	}
	// Sin institución no hay ámbito que contar: las 32 celdas quedan en 0
	// y los conteos en 0 (coherente con el resto de KPIs).
	if instID == -1 {
		resultado := []celdaCritica{}
		for _, tipo := range ordenTiposSangre {
			for _, col := range columnasStock {
				resultado = append(resultado, *celdas[tipo+":"+col])
			}
		}
		return resultado, 0, 0, nil
	}

	// 1. Tipos de sangre (id por nombre) para resolver umbrales.
	tipoIDs := map[string]int{}
	trows, err := database.DB.Query(`SELECT id, grupo_abo || factor_rh AS tipo FROM tipos_sangre`)
	if err != nil {
		return nil, 0, 0, err
	}
	for trows.Next() {
		var id int
		var tipo string
		if err := trows.Scan(&id, &tipo); err == nil {
			tipoIDs[tipo] = id
		}
	}
	trows.Close()

	// 2. Umbrales: si hay institución, los suyos; si no, el mínimo entre
	// todas las instituciones para esa celda (5 por defecto si no hay fila).
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
	minFijado := map[string]bool{} // "tipo:columna" -> ya se tomó un umbral

	// 3. Conteo de unidades disponibles por (tipo_sangre, hemocomponente),
	// sumando en la columna de la matriz (columnaHemo).
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
		return nil, 0, 0, err
	}
	defer crows.Close()
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
		celda, ok := celdas[tipo+":"+col]
		if !ok {
			continue
		}
		celda.Cant += cantidad
		// Mínimo de la celda: el menor entre las filas de umbral de los
		// tipos de hemocomponente que caen en esta columna (si alguno
		// tiene fila; si ninguno, queda el 5 por defecto).
		if tsID, ok := tipoIDs[tipo]; ok {
			clave := fmt.Sprintf("%d:%d", tsID, hemoID)
			if m, ok2 := umbrales[clave]; ok2 {
				claveCelda := tipo + ":" + col
				if !minFijado[claveCelda] || m < celda.Min {
					celda.Min = m
					minFijado[claveCelda] = true
				}
			}
		}
	}
	if err := crows.Err(); err != nil {
		return nil, 0, 0, err
	}

	// 4. Estados y conteos, en orden fijo.
	resultado := []celdaCritica{}
	var bajo, sinExistencias int
	for _, tipo := range ordenTiposSangre {
		for _, col := range columnasStock {
			celda := celdas[tipo+":"+col]
			switch {
			case celda.Cant == 0:
				celda.Estado = "sin_existencia"
				sinExistencias++
			case celda.Cant <= celda.Min:
				celda.Estado = "bajo"
				bajo++
			default:
				celda.Estado = "normal"
			}
			resultado = append(resultado, *celda)
		}
	}
	return resultado, bajo, sinExistencias, nil
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

// diasCaducidadStock es la ventana en días para "próximas a caducar".
const diasCaducidadStock = 7

// columnaHemo clasifica un componente del catálogo en una de las 4 columnas
// de la matriz. Devuelve "" si no pertenece a ninguna.
// "Paquete globular" es eritrocitos concentrados (el mismo producto que
// el concentrado eritrocitario), así que se clasifica como tal: sin este
// mapeo las unidades guardadas como "Paquete globular" eran invisibles
// en la matriz aunque existieran en la BD.
func columnaHemo(componente string) string {
	c := strings.ToLower(componente)
	switch {
	case strings.Contains(c, "sangre total"):
		return "sangreTotal"
	case strings.Contains(c, "eritrocitario") || strings.Contains(c, "eritrocito") || strings.Contains(c, "globular"):
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
	// La institución se resuelve desde el JWT (ver institucionParaConsulta).
	instID := institucionParaConsulta(r)
	if instID == -1 {
		// Sin sesión o sin institución: stock vacío, nunca el global.
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"kpis": map[string]interface{}{
				"unidadesDisponibles":   0,
				"tiposConExistencia":    0,
				"bajoMinimo":            0,
				"totalCombinaciones":    len(ordenTiposSangre) * 4,
				"sinExistencias":        0,
				"detalleSinExistencias": "Sin incidencias",
				"porCaducar":            0,
				"diasCaducidad":         diasCaducidadStock,
			},
			"matriz":          []filaMatriz{},
			"totalesColumnas": map[string]int{"sangreTotal": 0, "concEritrocitario": 0, "plasmaFresco": 0, "plaquetas": 0, "granTotal": 0},
			"alertas":         []alertaStock{},
			"proximasCaducar": []unidadCaducar{},
		})
		return
	}
	const diasCaducidad = diasCaducidadStock

	// Total REAL de unidades disponibles de la institución (COUNT separado):
	// una unidad cuyo componente no se pueda clasificar en la matriz
	// (columnaHemo == "") nunca debe volverse invisible en el total.
	// Antes este KPI era la suma de la matriz, así que las unidades
	// guardadas con un tipo no mapeable no se contaban en ningún lado.
	totalDisponibles := 0
	if err := database.DB.QueryRow(`
		SELECT COUNT(h.id)
		FROM hemocomponentes h
		JOIN estados_hemocomponente eh ON h.estado_id = eh.id AND eh.nombre ILIKE 'disponible'
		WHERE ($1 = 0 OR h.institucion_id = $1)
	`, instID).Scan(&totalDisponibles); err != nil {
		log.Printf("Error al contar unidades disponibles: %v", err)
	}

	// 1-4. Matriz 8 x 4 + KPIs + alertas, con la definición ÚNICA de
	// celdasCriticas (la misma que el KPI del Dashboard y la gráfica):
	// 32 combinaciones distintas, "Paquete globular" sumado en la
	// columna de concentrado eritrocitario.
	celdasCrit, bajoMinimo, sinExistencias, err := celdasCriticas(instID)
	if err != nil {
		log.Printf("Error al consultar stock: %v", err)
		http.Error(w, "Error al obtener stock", http.StatusInternalServerError)
		return
	}
	celdaPorClave := map[string]celdaCritica{}
	for _, c := range celdasCrit {
		celdaPorClave[c.Tipo+":"+c.Col] = c
	}

	// 4. Matriz 8 x 4 + KPIs + alertas de stock.
	matriz := []filaMatriz{}
	totales := map[string]int{"sangreTotal": 0, "concEritrocitario": 0, "plasmaFresco": 0, "plaquetas": 0, "granTotal": 0}
	var tiposConExistencia int
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
		for _, col := range columnasStock {
			c := celdaPorClave[tipo+":"+col]
			*celdas[col] = celdaStock{Cant: c.Cant, Min: c.Min, Estado: c.Estado}
			fila.Total += c.Cant
			totales[col] += c.Cant
			totales["granTotal"] += c.Cant
			if c.Cant > 0 {
				tiposConStock[tipo] = true
			}
			if c.Estado == "bajo" {
				alertas = append(alertas, alertaStock{
					ID: alertaID, TipoAlerta: "advertencia",
					Titulo:      fmt.Sprintf("%s · %s bajo el mínimo", tipo, nombreColumna(col)),
					Descripcion: fmt.Sprintf("Quedan %d unidades (mínimo %d).", c.Cant, c.Min),
					Tiempo:      "Ahora",
				})
				alertaID++
			}
			if c.Estado == "sin_existencia" {
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
			// NOTA: las unidades por caducar NO se suman a `alertas`: esa
			// lista es solo nivel de stock (bajo mínimo + sin existencias),
			// para que su conteo coincida con bajoMinimo + sinExistencias
			// y con el KPI del Dashboard. Las próximas a caducar se ven
			// en su propia sección (proximasCaducar).
		}
		prows.Close()
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"kpis": map[string]interface{}{
			"unidadesDisponibles":   totalDisponibles,
			"tiposConExistencia":    tiposConExistencia,
			"bajoMinimo":            bajoMinimo,
			"totalCombinaciones":    len(ordenTiposSangre) * len(columnasStock),
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
	// La institución solicitante se resuelve desde el JWT, no del body:
	// admin general (rol_id 1) puede indicar institucion_id; rol 2/3 siempre
	// usan su propia institución; sin institución no se puede solicitar.
	sesion, ok := sesionDesdeToken(r)
	if !ok {
		http.Error(w, "Token de autorización requerido", http.StatusUnauthorized)
		return
	}
	var institucionID int
	if sesion.RolID == 1 {
		if input.InstitucionID <= 0 {
			http.Error(w, "institucion_id es obligatorio", http.StatusBadRequest)
			return
		}
		institucionID = input.InstitucionID
	} else {
		if sesion.InstitucionID == nil {
			http.Error(w, "Tu usuario no tiene institución asignada. Pide al administrador general que te asigne una institución.", http.StatusBadRequest)
			return
		}
		institucionID = *sesion.InstitucionID
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

	// Usuario solicitante: el del JWT (ya validado arriba). Sin el
	// fallback a 1 de antes: una solicitud sin sesión no se crea.
	usuarioID := sesion.ID

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
	`, institucionID, usuarioID, prioridadID, estadoID, input.Motivo).Scan(&solicitudID)
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
	ID         string           `json:"id"`
	Institucion string          `json:"institucion"`
	Solicitante string          `json:"solicitante"`
	Telefono   string           `json:"telefono"`
	Prioridad  string           `json:"prioridad"`
	Motivo     string           `json:"motivo"`
	Estado     string           `json:"estado"`
	// Institución que atendió la solicitud (desde usuario_responde_id).
	// Vacío mientras sigue pendiente o si se atendió antes de la
	// migración 000003.
	AtendidaPor string `json:"atendidaPor,omitempty"`
	// Rechazo automático POR INSTITUCIÓN (no global): la solicitud sigue
	// Pendiente para que otra institución con stock sí pueda atenderla,
	// pero para la institución que la ve, su stock del tipo solicitado
	// es menor a 5 y no debería aceptarla.
	RechazoAutomatico bool   `json:"rechazoAutomatico"`
	MotivoRechazo     string `json:"motivoRechazo,omitempty"`
	FechaSolicitud    string `json:"fechaSolicitud"`
	FechaCompleta     string `json:"fechaCompleta"`
	TotalUnidades     int    `json:"totalUnidades"`
	Unidades          []unidadEntrante `json:"unidades"`
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

// contarDisponibles cuenta las unidades Disponibles de una institución con
// ese tipo sanguíneo + hemocomponente (mismo patrón EXISTS que GetStock).
func contarDisponibles(instID, tipoID, hemoID int) int {
	var n int
	err := database.DB.QueryRow(`
		SELECT COUNT(h.id) FROM hemocomponentes h
		JOIN estados_hemocomponente eh ON h.estado_id = eh.id AND eh.nombre ILIKE 'disponible'
		WHERE h.institucion_id = $1 AND h.tipo_sangre_id = $2 AND h.tipo_hemocomponente_id = $3
	`, instID, tipoID, hemoID).Scan(&n)
	if err != nil {
		return 0
	}
	return n
}

// minimoUmbral devuelve el mínimo de umbrales_stock para esa combinación e
// institución (5 por defecto si no hay fila, igual que GetStock y
// GetStockPorTipo). Crítico = disponible <= mínimo.
func minimoUmbral(instID, tipoID, hemoID int) int {
	var m sql.NullInt64
	err := database.DB.QueryRow(`
		SELECT MIN(stock_minimo) FROM umbrales_stock
		WHERE tipo_sangre_id = $1 AND tipo_hemocomponente_id = $2
		  AND ($3 = 0 OR institucion_id = $3)
	`, tipoID, hemoID, instID).Scan(&m)
	if err != nil || !m.Valid {
		return 5
	}
	return int(m.Int64)
}

// nombreHemoParaMensaje muestra "Paquete globular" como "Concentrado
// eritrocitario": es el mismo producto (ver catalogosService).
func nombreHemoParaMensaje(componente string) string {
	if normalizarNombre(componente) == "paquete globular" {
		return "Concentrado eritrocitario"
	}
	return componente
}

// findOrCreateTipoAlerta busca un tipo de alerta por nombre y lo crea si no
// existe (la UNIQUE de tipos_alerta evita duplicados). Devuelve su id.
func findOrCreateTipoAlerta(nombre, descripcion string) (int, error) {
	var id int
	err := database.DB.QueryRow(`
		INSERT INTO tipos_alerta (nombre, descripcion) VALUES ($1, $2)
		ON CONFLICT (nombre) DO NOTHING
		RETURNING id`, nombre, descripcion).Scan(&id)
	if err == nil {
		return id, nil
	}
	// Ya existía (DO NOTHING no devolvió fila): buscar su id.
	err2 := database.DB.QueryRow(
		`SELECT id FROM tipos_alerta WHERE nombre = $1`, nombre).Scan(&id)
	if err2 != nil {
		return 0, err2
	}
	return id, nil
}

func GetSolicitudesEntrantes(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}
	// La institución se resuelve desde el JWT (ver institucionParaConsulta):
	// entrantes = solicitudes de OTRAS instituciones, pendientes de atender.
	instID := institucionParaConsulta(r)
	if instID == -1 {
		writeJSON(w, http.StatusOK, []solicitudEntrante{})
		return
	}
	rows, err := database.DB.Query(`
		SELECT s.id, i.nombre AS institucion, u.nombre AS solicitante,
		       COALESCE(i.telefono, '') AS telefono,
		       LOWER(np.nombre) AS prioridad, COALESCE(s.motivo, '') AS motivo,
		       LOWER(es.nombre) AS estado,
		       COALESCE(ir.nombre, '') AS atendida_por,
		       TO_CHAR(s.fecha_solicitud, 'DD Mon · HH24:MI') AS fecha_solicitud,
		       TO_CHAR(s.fecha_solicitud, 'DD Mon YYYY · HH24:MI') AS fecha_completa
		FROM solicitudes_emergencia s
		JOIN instituciones i ON s.institucion_solicitante_id = i.id
		JOIN usuarios u ON s.usuario_solicitante_id = u.id
		JOIN niveles_prioridad np ON s.prioridad_id = np.id
		JOIN estados_solicitud es ON s.estado_id = es.id
		LEFT JOIN usuarios ur ON s.usuario_responde_id = ur.id
		LEFT JOIN instituciones ir ON ur.institucion_id = ir.id
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
		if err := rows.Scan(&numID, &s.Institucion, &s.Solicitante, &s.Telefono, &s.Prioridad, &s.Motivo, &s.Estado, &s.AtendidaPor, &s.FechaSolicitud, &s.FechaCompleta); err != nil {
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

		// Rechazo automático POR INSTITUCIÓN: si la solicitud sigue
		// pendiente y de algún tipo solicitado tenemos menos de 5
		// unidades, esta institución no debería aceptarla. La solicitud
		// SIGUE pendiente globalmente: otra institución con stock sí
		// puede atenderla. El admin general (instID 0) no atiende
		// solicitudes, así que no se le marca.
		if s.Estado == "pendiente" && instID > 0 {
			for _, u := range s.Unidades {
				if u.Disponibles < 5 {
					s.RechazoAutomatico = true
					s.MotivoRechazo = fmt.Sprintf("Tu stock de %s %s es menor a 5 (disponibles: %d).", u.Tipo, nombreHemoParaMensaje(u.Hemocomponente), u.Disponibles)
					break
				}
			}
		}

		solicitudes = append(solicitudes, s)
	}
	writeJSON(w, http.StatusOK, solicitudes)
}

// ---------------------------------------------------------------------------
// POST /api/solicitudes/entrantes/{id}/aceptar | /rechazar
// Solo el administrador institucional (rol_id 2) puede responder
// solicitudes entrantes: es quien atiende los requerimientos de su
// institución. El personal médico (rol_id 3) las ve en solo lectura y
// el admin general (rol_id 1) no atiende solicitudes de instituciones.
// ---------------------------------------------------------------------------

func ResponderSolicitud(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}
	sesion, ok := sesionDesdeToken(r)
	if !ok {
		http.Error(w, "Token de autorización requerido", http.StatusUnauthorized)
		return
	}
	if sesion.RolID != 2 {
		http.Error(w, "Solo el administrador institucional puede responder solicitudes entrantes", http.StatusForbidden)
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

	// ACEPTAR: condiciones de stock antes de atender. Rechazar sigue el
	// camino de siempre (sin chequeos de stock ni notificación).
	if accion == "aceptar" {
		// (0) La solicitud debe existir y seguir pendiente. Sin esto, dos
		// instituciones podrían "aceptar" la misma y avisar dos veces.
		var estadoActual string
		var instSolicitante int
		err = database.DB.QueryRow(`
			SELECT LOWER(es.nombre), s.institucion_solicitante_id
			FROM solicitudes_emergencia s
			JOIN estados_solicitud es ON s.estado_id = es.id
			WHERE s.id = $1
		`, numID).Scan(&estadoActual, &instSolicitante)
		if err != nil {
			http.Error(w, "Solicitud no encontrada", http.StatusNotFound)
			return
		}
		if estadoActual != "pendiente" {
			http.Error(w, "Esta solicitud ya fue atendida (estado actual: "+estadoActual+").", http.StatusBadRequest)
			return
		}
		if sesion.InstitucionID == nil {
			http.Error(w, "Tu usuario no tiene institución asignada y no se puede verificar tu stock.", http.StatusBadRequest)
			return
		}
		instID := *sesion.InstitucionID

		// Detalles solicitados (tipo, hemocomponente, cantidad).
		type detalleSolicitud struct {
			tipoID, hemoID, cantidad int
			tipo, hemo               string
		}
		drows, err := database.DB.Query(`
			SELECT sd.tipo_sangre_id, sd.tipo_hemocomponente_id, sd.cantidad,
			       ts.grupo_abo || ts.factor_rh AS tipo, th.componente AS hemocomponente
			FROM solicitud_detalles sd
			JOIN tipos_sangre ts ON sd.tipo_sangre_id = ts.id
			JOIN tipos_hemocomponente th ON sd.tipo_hemocomponente_id = th.id
			WHERE sd.solicitud_id = $1
		`, numID)
		if err != nil {
			http.Error(w, "Error al leer los detalles de la solicitud", http.StatusInternalServerError)
			return
		}
		detalles := []detalleSolicitud{}
		for drows.Next() {
			var d detalleSolicitud
			if err := drows.Scan(&d.tipoID, &d.hemoID, &d.cantidad, &d.tipo, &d.hemo); err == nil {
				detalles = append(detalles, d)
			}
		}
		drows.Close()
		if len(detalles) == 0 {
			http.Error(w, "La solicitud no tiene unidades detalladas.", http.StatusBadRequest)
			return
		}

		// (a) Suficiencia: hay que contar con unidades de ese tipo.
		// (b) Nivel crítico: atender no debe dejar el stock propio en
		// nivel crítico (crítico = disponible <= mínimo, así que tras
		// atender debe quedar disponible > mínimo).
		// Aceptar NO mueve ni descuenta unidades: solo son las
		// condiciones para poder aceptar; el descuento/asignación de
		// unidades sigue siendo un flujo aparte.
		for _, d := range detalles {
			hemoMsg := nombreHemoParaMensaje(d.hemo)
			disp := contarDisponibles(instID, d.tipoID, d.hemoID)
			if disp < d.cantidad {
				http.Error(w, fmt.Sprintf("No cuentas con unidades suficientes de %s %s para atender esta solicitud (disponibles: %d, solicitadas: %d).", d.tipo, hemoMsg, disp, d.cantidad), http.StatusBadRequest)
				return
			}
			min := minimoUmbral(instID, d.tipoID, d.hemoID)
			if disp-d.cantidad <= min {
				http.Error(w, fmt.Sprintf("Atender esta solicitud dejaría tu stock de %s %s en nivel crítico (quedarían %d, mínimo %d).", d.tipo, hemoMsg, disp-d.cantidad, min), http.StatusBadRequest)
				return
			}
		}

		// Nombre de la institución que atiende (respuesta y notificación).
		var nombreInstAcepta string
		_ = database.DB.QueryRow(`SELECT nombre FROM instituciones WHERE id = $1`, instID).Scan(&nombreInstAcepta)
		folio := fmt.Sprintf("SOL-%04d", numID)

		// Tipo de alerta (se crea si no existe; la UNIQUE evita duplicados).
		tipoAlertaID, err := findOrCreateTipoAlerta("solicitud_atendida", "Una solicitud de emergencia fue atendida por otra institución")
		if err != nil {
			log.Printf("Error al resolver tipo de alerta: %v", err)
			http.Error(w, "Error al responder la solicitud", http.StatusInternalServerError)
			return
		}

		// Aceptar + registrar quién respondió + avisar a las demás
		// instituciones, todo en una transacción.
		tx, err := database.DB.Begin()
		if err != nil {
			http.Error(w, "Error al responder la solicitud", http.StatusInternalServerError)
			return
		}
		defer tx.Rollback()

		res, err := tx.Exec(`
			UPDATE solicitudes_emergencia
			SET estado_id = $1, fecha_cierre = NOW(), usuario_responde_id = $2
			WHERE id = $3
			  AND estado_id = (SELECT id FROM estados_solicitud WHERE LOWER(nombre) = 'pendiente')
		`, estadoID, sesion.ID, numID)
		if err != nil {
			http.Error(w, "Error al responder la solicitud", http.StatusInternalServerError)
			return
		}
		n, _ := res.RowsAffected()
		if n == 0 {
			http.Error(w, "Esta solicitud ya fue atendida.", http.StatusBadRequest)
			return
		}

		var alertaID int
		err = tx.QueryRow(`
			INSERT INTO alertas (tipo_alerta_id, institucion_id, solicitud_id, mensaje)
			VALUES ($1, $2, $3, $4)
			RETURNING id
		`, tipoAlertaID, instID, numID, fmt.Sprintf("La solicitud %s fue atendida por %s.", folio, nombreInstAcepta)).Scan(&alertaID)
		if err != nil {
			log.Printf("Error al crear alerta de solicitud atendida: %v", err)
			http.Error(w, "Error al responder la solicitud", http.StatusInternalServerError)
			return
		}

		// Notificación a los usuarios activos de las DEMÁS instituciones
		// (todas menos la que acepta y menos la solicitante): así saben
		// que ya fue atendida y no envían unidades de más.
		if _, err := tx.Exec(`
			INSERT INTO notificaciones (alerta_id, usuario_id)
			SELECT $1, id FROM usuarios
			WHERE estado = true
			  AND institucion_id IS NOT NULL
			  AND institucion_id <> $2
			  AND institucion_id <> $3
			ON CONFLICT (alerta_id, usuario_id) DO NOTHING
		`, alertaID, instID, instSolicitante); err != nil {
			log.Printf("Error al crear notificaciones de solicitud atendida: %v", err)
			http.Error(w, "Error al responder la solicitud", http.StatusInternalServerError)
			return
		}

		if err := tx.Commit(); err != nil {
			http.Error(w, "Error al responder la solicitud", http.StatusInternalServerError)
			return
		}

		writeJSON(w, http.StatusOK, map[string]interface{}{
			"mensaje":     "Solicitud " + estadoNombre + " con éxito",
			"id":          numID,
			"estado":      estadoNombre,
			"atendidaPor": nombreInstAcepta,
		})
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
	Fecha       string `json:"fecha"` // YYYY-MM-DD, para el filtro de fechas del frontend
}

func GetHistorico(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}
	// La institución se resuelve desde el JWT (ver institucionParaConsulta).
	instID := institucionParaConsulta(r)
	if instID == -1 {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"total":       0,
			"conteos":     map[string]int{"todas": 0, "enviadas": 0, "recibidas": 0},
			"solicitudes": []solicitudHistorico{},
		})
		return
	}
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
		       TO_CHAR(s.fecha_solicitud, 'YYYY-MM-DD') AS fecha_iso,
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
		if err := rows.Scan(&numID, &s.Institucion, &s.Prioridad, &s.Unidades, &s.Solicitada, &s.Cerrada, &s.Estado, &s.Fecha, &s.Tipo); err != nil {
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
