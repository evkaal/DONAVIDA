package handlers

import (
	"donavida-backend/internal/database"
	"encoding/json"
"database/sql"
  "strings"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// Clave para los tokens JWT (con variables de entorno)
var jwtKey = []byte(getJWTSecret())

func getJWTSecret() string {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = os.Getenv("JWT_Secret")
	}
	if secret == "" {
		log.Fatal("Fatal: la variable de entorno JWT_SECRET no esta definida")
	}
	return secret
}

type claims struct {
	Email string `json:"email"`
	RolID int    `json:"rol_id"`
	jwt.RegisteredClaims
}

type usuarioInput struct {
	Nombre        string `json:"nombre"`
	Email         string `json:"email"`
	Password      string `json:"password"`
	RolID         int    `json:"rol_id"`
	InstitucionId *int   `json:"institucion_id"`
}

// contrasenaSegura exige mínimo 8 caracteres con al menos una
// mayúscula, una minúscula y un dígito.
func contrasenaSegura(p string) bool {
	if len(p) < 8 {
		return false
	}
	var mayus, minus, digito bool
	for _, c := range p {
		switch {
		case c >= 'A' && c <= 'Z':
			mayus = true
		case c >= 'a' && c <= 'z':
			minus = true
		case c >= '0' && c <= '9':
			digito = true
		}
	}
	return mayus && minus && digito
}

// contieneDigito dice si el texto tiene algún dígito (0-9).
func contieneDigito(s string) bool {
	return strings.ContainsAny(s, "0123456789")
}

// Función Register para atender la ruta /api/register
func Register(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}

	var input struct {
		Nombre        string `json:"nombre"`
		Email         string `json:"email"`
		Password      string `json:"password"`
		RolID         int    `json:"rol_id"`
		InstitucionId *int   `json:"institucion_id"` // Usamos puntero para manejar nulos si es un admin general
	}

	err := json.NewDecoder(r.Body).Decode(&input)
	if err != nil {
		http.Error(w, "Error al leer los datos: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Nombre de usuario sin números (acentos, espacios y guiones sí se
	// permiten). Solo aplica al nombre del usuario, no a otros campos.
	if contieneDigito(input.Nombre) {
		http.Error(w, "El nombre de usuario no puede contener números.", http.StatusBadRequest)
		return
	}

	// Contraseña segura: mínimo 8 caracteres, mayúscula, minúscula y
	// número. Se exige al registrar y también al entrar: un usuario
	// existente con contraseña débil no puede iniciar sesión hasta que
	// un administrador le asigne una contraseña nueva (ver Login).
	if !contrasenaSegura(input.Password) {
		http.Error(w, "La contraseña debe tener al menos 8 caracteres e incluir mayúsculas, minúsculas y números.", http.StatusBadRequest)
		return
	}

	// Encriptar la contraseña con bcrypt
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Error al encriptar la contraseña", http.StatusInternalServerError)
		return
	}

	// Resolver al creador (si viene token JWT): su id queda en creado_por
	// (columna de la migración 000002) y, si es admin_institucion (rol_id 2),
	// la institución del nuevo usuario se fuerza a la suya: no puede crear
	// usuarios para otra institución. Tampoco puede crear un admin general.
	// El personal médico (rol_id 3) NO puede crear usuarios.
	// Sin token (registro público /api/register), creado_por queda NULL.
	creador, tieneCreador := sesionDesdeToken(r)
	if tieneCreador && creador.RolID == 3 {
		http.Error(w, "El personal médico no puede crear usuarios", http.StatusForbidden)
		return
	}
	institucionID := input.InstitucionId
	if tieneCreador {
		if creador.RolID == 2 {
			if input.RolID == 1 {
				http.Error(w, "Un admin institucional no puede crear un administrador general", http.StatusForbidden)
				return
			}
			if creador.InstitucionID == nil {
				http.Error(w, "Tu usuario no tiene institución asignada. Pide al administrador general que te asigne una institución.", http.StatusBadRequest)
				return
			}
			v := *creador.InstitucionID
			institucionID = &v
		}
	}
	var creadoPor *int
	if tieneCreador {
		creadoPor = &creador.ID
	}

	// Insertar en la base de datos vinculando la institución correspondiente
	query := `INSERT INTO usuarios (nombre, email, password_hash, rol_id, institucion_id, estado, creado_por) VALUES ($1, $2, $3, $4, $5, true, $6)`
	_, err = database.DB.Exec(query, input.Nombre, input.Email, string(hashedPassword), input.RolID, institucionID, creadoPor)
	if err != nil {
		log.Printf("Error al registrar usuario: %v", err)
		http.Error(w, "Error al registrar el usuario en la BD: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"mensaje": "Usuario registrado con éxito"})
}

// Función Login para atender la ruta /api/login
func Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}

	var input usuarioInput
	err := json.NewDecoder(r.Body).Decode(&input)
	if err != nil {
		http.Error(w, "Error al leer los datos", http.StatusBadRequest)
		return
	}

	// 1. Buscar el usuario en la base de datos ÚNICAMENTE por su email
	var storedHash string
	var nombreUsuario string
	var rolID int
	var activo bool
	var institucionID sql.NullInt64
	var institucionNombre sql.NullString

	query := `SELECT u.nombre, u.password_hash, u.rol_id, u.estado, u.institucion_id, i.nombre
		FROM usuarios u
		LEFT JOIN instituciones i ON u.institucion_id = i.id
		WHERE u.email = $1`
	err = database.DB.QueryRow(query, input.Email).Scan(&nombreUsuario, &storedHash, &rolID, &activo, &institucionID, &institucionNombre)

	if err != nil {
		log.Printf("Error buscando usuario por email (%s): %v", input.Email, err)
		http.Error(w, "Correo o contraseña incorrectos", http.StatusUnauthorized)
		return
	}

	// 2. Comparar la contraseña ingresada en texto plano con el hash de la BD
	err = bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(input.Password))
	if err != nil {
		log.Printf("Contraseña incorrecta para el usuario: %s", input.Email)
		http.Error(w, "Correo o contraseña incorrectos", http.StatusUnauthorized)
		return
	}

	// 2b. Cuenta dada de baja: aunque la contraseña sea correcta, no entra.
	if !activo {
		log.Printf("Login rechazado: usuario dado de baja (%s)", input.Email)
		http.Error(w, "Tu cuenta fue dada de baja. Contacta a un administrador para reactivarla.", http.StatusUnauthorized)
		return
	}

	// 2c. Política de contraseña también al entrar: la contraseña debe
	// cumplir la misma regla que al registrar (mínimo 8 caracteres con
	// mayúscula, minúscula y número). Un usuario existente con contraseña
	// débil no entra hasta que un administrador le asigne una nueva.
	if !contrasenaSegura(input.Password) {
		log.Printf("Login rechazado: contraseña débil (%s)", input.Email)
		http.Error(w, "Tu contraseña no cumple con la política de seguridad (mínimo 8 caracteres con mayúscula, minúscula y número). Pide a un administrador que te asigne una contraseña nueva.", http.StatusUnauthorized)
		return
	}

	// 3. Generar el Token JWT
	expirationTime := time.Now().Add(24 * time.Hour)
	claims := claims{
		Email: input.Email,
		RolID: rolID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtKey)
	if err != nil {
		http.Error(w, "Error al generar el token de acceso", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	var institucionIDResp interface{}
	var institucionResp interface{}
	if institucionID.Valid {
		institucionIDResp = int(institucionID.Int64)
	}
	if institucionNombre.Valid {
		institucionResp = institucionNombre.String
	}
	json.NewEncoder(w).Encode(map[string]interface{}{
		"mensaje":        "Login exitoso",
		"token":          tokenString,
		"nombre":         nombreUsuario,
		"email":          input.Email,
		"rol_id":         rolID,
		"institucion_id": institucionIDResp,
		"institucion":    institucionResp,
	})
}

// Función GetDashboardStats para atender la ruta /api/dashboard/stats
func GetDashboardStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}

	// La institución se resuelve desde el JWT (ver institucionParaConsulta
	// en solicitudes.go): un admin_institucion ve solo los números de su
	// institución; sin institución, los conteos quedan en 0.
	instID := institucionParaConsulta(r)

	var uniDisponibles, proxCaducar, SolPendientes, nivCriticos int

	// 2. Unidades disponibles (Si instID es 0 trae todo, si tiene valor filtra por institución)
	err := database.DB.QueryRow(`
		SELECT COUNT(h.id) FROM hemocomponentes h
		JOIN estados_hemocomponente e ON h.estado_id = e.id
		WHERE e.nombre ILIKE 'disponible' AND ($1 = 0 OR h.institucion_id = $1)
	`, instID).Scan(&uniDisponibles)
	if err != nil {
		log.Printf("Error al consultar unidades disponibles: %v", err)
	}

	// 3. Próximas a caducar
	err = database.DB.QueryRow(`
		SELECT COUNT(h.id) FROM hemocomponentes h 
		JOIN estados_hemocomponente e ON h.estado_id = e.id
		WHERE e.nombre ILIKE 'disponible'
		  AND h.fecha_caducidad BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
		  AND ($1 = 0 OR h.institucion_id = $1)
	`, instID).Scan(&proxCaducar)
	if err != nil {
		log.Printf("Error al consultar las unidades a caducar: %v", err)
	}

	// 4. Solicitudes pendientes
	err = database.DB.QueryRow(`
		SELECT COUNT(s.id) FROM solicitudes_emergencia s
		JOIN estados_solicitud e ON s.estado_id = e.id
		WHERE e.nombre ILIKE 'pendiente'
		  AND ($1 = 0 OR s.institucion_solicitante_id = $1)
	`, instID).Scan(&SolPendientes)
	if err != nil {
		log.Printf("Aviso: Solicitudes pendientes vacías o sin tabla: %v", err)
		SolPendientes = 0
	}

	// 5. Niveles críticos — MISMO criterio que la gráfica de
	// GetStockPorTipo: se cuentan las COMBINACIONES (tipo sanguíneo ×
	// hemocomponente) cuyo disponible es <= su mínimo de umbrales_stock
	// (5 por defecto, igual que GetStock, si no hay fila de umbral para
	// esa combinación). Antes solo se contaban las filas que existían en
	// umbrales_stock, así que con esa tabla vacía el KPI era 0 aunque la
	// gráfica marcara barras en rojo por el defecto 5.
	err = database.DB.QueryRow(`
		SELECT COUNT(*) FROM (
			SELECT ts.id AS ts_id, th.id AS th_id,
			       COUNT(h.id) AS cantidad,
			       COALESCE(MIN(u.stock_minimo), 5) AS minimo
			FROM tipos_sangre ts
			CROSS JOIN tipos_hemocomponente th
			LEFT JOIN hemocomponentes h
			       ON h.tipo_sangre_id = ts.id
			      AND h.tipo_hemocomponente_id = th.id
			      AND ($1 = 0 OR h.institucion_id = $1)
			      AND EXISTS (SELECT 1 FROM estados_hemocomponente eh
			                   WHERE eh.id = h.estado_id
			                     AND eh.nombre ILIKE 'disponible')
			LEFT JOIN umbrales_stock u
			       ON u.tipo_sangre_id = ts.id
			      AND u.tipo_hemocomponente_id = th.id
			      AND ($1 = 0 OR u.institucion_id = $1)
			GROUP BY ts.id, th.id
		) c WHERE c.cantidad <= c.minimo
	`, instID).Scan(&nivCriticos)
	if err != nil {
		log.Printf("Aviso: umbrales_stock no configurado: %v", err)
		nivCriticos = 0
	}

	// Responder con el JSON estructurado
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]int{
		"totalUnidades":         uniDisponibles,
		"proximasCaducar":       proxCaducar,
		"solicitudesPendientes": SolPendientes,
		"nivelesCriticos":       nivCriticos,
	})
}

// 1. Obtener stock agrupado por tipo sanguíneo para la gráfica.
// Cuenta SOLO unidades disponibles y SOLO de la institución del usuario
// (misma semántica que GetDashboardStats): rol 1 ve todas las
// instituciones, rol 2/3 solo la suya, y sin institución todo queda en 0.
// Los 8 tipos de sangre siempre aparecen (con 0 si no hay unidades), por
// eso los filtros van en la condición del LEFT JOIN, nunca en un WHERE.
func GetStockPorTipo(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}

	instID := institucionParaConsulta(r)

	// Crítico con el MISMO criterio que el KPI "Niveles críticos" de
	// GetDashboardStats: por cada combinación (tipo sanguíneo ×
	// hemocomponente) se compara el disponible con su mínimo de
	// umbrales_stock (5 por defecto, igual que GetStock, si no hay fila
	// de umbral para esa combinación). Un tipo es crítico si ALGUNA de
	// sus combinaciones está por debajo de su mínimo. Así, una barra
	// roja en la gráfica implica al menos una combinación contada en el
	// KPI (cuando esa combinación tiene su umbral configurado).
	rows, err := database.DB.Query(`
        SELECT ts.grupo_abo || ts.factor_rh AS tipo,
               th.id AS hemo_id,
               COUNT(h.id) AS cantidad,
               COALESCE(MIN(u.stock_minimo), 5) AS minimo
        FROM tipos_sangre ts
        CROSS JOIN tipos_hemocomponente th
        LEFT JOIN hemocomponentes h
               ON h.tipo_sangre_id = ts.id
              AND h.tipo_hemocomponente_id = th.id
              AND ($1 = 0 OR h.institucion_id = $1)
              AND EXISTS (SELECT 1 FROM estados_hemocomponente eh
                           WHERE eh.id = h.estado_id
                             AND eh.nombre ILIKE 'disponible')
        LEFT JOIN umbrales_stock u
               ON u.tipo_sangre_id = ts.id
              AND u.tipo_hemocomponente_id = th.id
              AND ($1 = 0 OR u.institucion_id = $1)
        GROUP BY ts.grupo_abo, ts.factor_rh, th.id
        ORDER BY tipo, th.id;
    `, instID)
	if err != nil {
		http.Error(w, "Error al consultar stock por tipo", http.StatusInternalServerError)
		return
	}
	// Colocamos el defer inmediatamente después de comprobar que no hubo error en la consulta
	defer rows.Close()

	type StockTipo struct {
		Tipo      string `json:"tipo"`
		Cantidad  int    `json:"cantidad"`
		EsCritico bool   `json:"esCritico"`
	}

	var stockList []StockTipo
	// Agregado por tipo: la cantidad es la suma de sus combinaciones y
	// es crítico si alguna combinación está por debajo de su mínimo.
	indicePorTipo := map[string]int{}
	for rows.Next() {
		var tipo string
		var hemoID, cantidad, minimo int
		if err := rows.Scan(&tipo, &hemoID, &cantidad, &minimo); err != nil {
			continue
		}
		idx, ok := indicePorTipo[tipo]
		if !ok {
			stockList = append(stockList, StockTipo{Tipo: tipo})
			idx = len(stockList) - 1
			indicePorTipo[tipo] = idx
		}
		stockList[idx].Cantidad += cantidad
		// Mismo comparador que el KPI (disponible <= mínimo).
		if cantidad <= minimo {
			stockList[idx].EsCritico = true
		}
	}

	// Verificamos si hubo algún error al finalizar el recorrido de las filas (soluciona la advertencia)
	if err = rows.Err(); err != nil {
		http.Error(w, "Error al procesar los resultados de stock", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stockList)
}

// 2. Obtener solicitudes recientes para el dashboard
func GetSolicitudesRecientes(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}

	rows, err := database.DB.Query(`
        SELECT s.id, ts.grupo_abo || ts.factor_rh AS tipo_sangre, 
               i.nombre AS institucion, sd.cantidad, es.nombre AS estado
        FROM solicitudes_emergencia s
        JOIN instituciones i ON s.institucion_solicitante_id = i.id
        JOIN solicitud_detalles sd ON s.id = sd.solicitud_id
        JOIN tipos_sangre ts ON sd.tipo_sangre_id = ts.id
        JOIN estados_solicitud es ON s.estado_id = es.id
        ORDER BY s.fecha_solicitud DESC
        LIMIT 5;
    `)
	if err != nil {
		http.Error(w, "Error al consultar solicitudes recientes", http.StatusInternalServerError)
		return
	}
	// Colocamos el defer inmediatamente aquí también
	defer rows.Close()

	type SolicitudReciente struct {
		ID          int    `json:"id"`
		TipoSangre  string `json:"tipoSangre"`
		Institucion string `json:"institucion"`
		Cantidad    int    `json:"unidades"`
		Estado      string `json:"estado"`
	}

	var solicitudes []SolicitudReciente
	for rows.Next() {
		var sol SolicitudReciente
		var idInt int
		if err := rows.Scan(&idInt, &sol.TipoSangre, &sol.Institucion, &sol.Cantidad, &sol.Estado); err != nil {
			continue
		}
		sol.ID = idInt
		solicitudes = append(solicitudes, sol)
	}

	// Verificación de errores en el bucle de solicitudes
	if err = rows.Err(); err != nil {
		http.Error(w, "Error al procesar las solicitudes recientes", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(solicitudes)
}

// RegistrarUnidad atiende la ruta POST /api/unidades
type UnidadInput struct {
	Codigo          string `json:"codigo"` // IGNORADO: el código lo genera el servidor (UN-0000, UN-0001, ...)
	TipoSangre      string `json:"tipoSangre"`     // Ej: "O+"
	Hemocomponente  string `json:"hemocomponente"` // Ej: "Concentrado eritrocitario"
	Volumen         string `json:"volumen"`
	FechaExtraccion string `json:"fechaExtraccion"`
	FechaCaducidad  string `json:"fechaCaducidad"`
	Estado          string `json:"estado"` // "Disponible"
	InstitucionID   int    `json:"institucion_id"`
}

// generarCodigoUnidad calcula el siguiente código de unidad dentro de la
// transacción: MAX del sufijo numérico de los códigos UN-#### existentes + 1.
// La tabla se bloquea en modo exclusivo durante el cálculo y la inserción
// para que dos registros simultáneos no generen el mismo código
// (codigo_unidad es UNIQUE). Si la tabla está vacía, el primer código es
// UN-0000; si ya hay unidades, sigue desde la mayor existente para no
// duplicar códigos.
func generarCodigoUnidad(tx *sql.Tx) (string, error) {
	if _, err := tx.Exec(`LOCK TABLE hemocomponentes IN EXCLUSIVE MODE`); err != nil {
		return "", err
	}
	var maxCodigo sql.NullInt64
	err := tx.QueryRow(`
		SELECT MAX(CAST(SUBSTRING(codigo_unidad FROM '^UN-([0-9]+)$') AS INTEGER))
		FROM hemocomponentes`).Scan(&maxCodigo)
	if err != nil {
		return "", err
	}
	siguiente := 0
	if maxCodigo.Valid {
		siguiente = int(maxCodigo.Int64) + 1
	}
	return fmt.Sprintf("UN-%04d", siguiente), nil
}

func RegistrarUnidad(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}

	var input UnidadInput
	err := json.NewDecoder(r.Body).Decode(&input)
	if err != nil {
		http.Error(w, "Error al leer los datos de la unidad", http.StatusBadRequest)
		return
	}

	// La institución se resuelve desde el JWT, no del body: un
	// admin_institucion solo registra unidades para su propia institución.
	// Admin general (rol_id 1) puede indicar institucion_id.
	sesion, ok := sesionDesdeToken(r)
	if !ok {
		http.Error(w, "Token de autorización requerido", http.StatusUnauthorized)
		return
	}
	var institucionID int
	if sesion.RolID == 1 {
		if input.InstitucionID <= 0 {
			http.Error(w, "institucion_id es obligatorio para el admin general", http.StatusBadRequest)
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

	// 1. Obtener el ID del tipo de sangre (separando grupo ABO y factor Rh)
	var tipoSangreID int
	var grupoBO, factorRh string
	if len(input.TipoSangre) >= 2 {
		grupoBO = input.TipoSangre[:len(input.TipoSangre)-1]
		factorRh = input.TipoSangre[len(input.TipoSangre)-1:]
	} else {
		grupoBO = input.TipoSangre
		factorRh = "+"
	}

	err = database.DB.QueryRow(`
		SELECT id FROM tipos_sangre WHERE grupo_abo = $1 AND factor_rh = $2
	`, grupoBO, factorRh).Scan(&tipoSangreID)
	if err != nil {
		log.Printf("Error buscando tipo_sangre (%s, %s): %v", grupoBO, factorRh, err)
		http.Error(w, "Tipo sanguíneo no válido en la base de datos", http.StatusBadRequest)
		return
	}

	// 2. Obtener el ID del tipo de hemocomponente con la lógica compartida
	// (resolveHemocomponenteID, tolerante a acentos, mayúsculas y nombres
	// parciales). SIN fallback silencioso a un id arbitrario: si no se
	// resuelve, la unidad NO se guarda, porque antes se guardaba con el
	// tipo equivocado y el stock no la contaba en ninguna columna.
	tipoHemocomponenteID, err := resolveHemocomponenteID(input.Hemocomponente)
	if err != nil {
		http.Error(w, "Hemocomponente no válido: "+input.Hemocomponente, http.StatusBadRequest)
		return
	}

	// 3. Obtener el ID del estado (ej. "Disponible"; vacío = Disponible).
	// SIN fallback silencioso: si no existe en estados_hemocomponente, error.
	estadoNombre := strings.TrimSpace(input.Estado)
	if estadoNombre == "" {
		estadoNombre = "Disponible"
	}
	var estadoID int
	err = database.DB.QueryRow(`
		SELECT id FROM estados_hemocomponente WHERE nombre ILIKE $1
	`, estadoNombre).Scan(&estadoID)
	if err != nil {
		http.Error(w, "Estado no válido: "+estadoNombre, http.StatusBadRequest)
		return
	}

	// 4. Insertar en hemocomponentes con el código generado por el servidor
	// (el codigo que mande el cliente se ignora). Si dos registros chocan
	// con la UNIQUE de codigo_unidad, se reintenta una sola vez.
	var nuevoID int
	var codigoGenerado string
	var insertErr error
	for intento := 0; intento < 2; intento++ {
		tx, errBegin := database.DB.Begin()
		if errBegin != nil {
			http.Error(w, "Error al iniciar la transacción", http.StatusInternalServerError)
			return
		}
		codigo, errGen := generarCodigoUnidad(tx)
		if errGen != nil {
			tx.Rollback()
			log.Printf("Error al generar código de unidad: %v", errGen)
			http.Error(w, "Error al generar el código de la unidad", http.StatusInternalServerError)
			return
		}
		errInsert := tx.QueryRow(`
			INSERT INTO hemocomponentes
			(codigo_unidad, tipo_sangre_id, tipo_hemocomponente_id, estado_id, institucion_id, fecha_extraccion, fecha_caducidad)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			RETURNING id
		`, codigo, tipoSangreID, tipoHemocomponenteID, estadoID, institucionID, input.FechaExtraccion, input.FechaCaducidad).Scan(&nuevoID)
		if errInsert != nil {
			tx.Rollback()
			if intento == 0 && strings.Contains(errInsert.Error(), "duplicate key") {
				continue
			}
			insertErr = errInsert
			break
		}
		if errCommit := tx.Commit(); errCommit != nil {
			insertErr = errCommit
			break
		}
		codigoGenerado = codigo
		insertErr = nil
		break
	}
	if insertErr != nil {
		log.Printf("Error al insertar unidad en BD: %v", insertErr)
		http.Error(w, "Error al registrar la unidad en la base de datos: "+insertErr.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"mensaje": "Unidad registrada con éxito en la BD",
		"id":      nuevoID,
		"codigo":  codigoGenerado,
		"folio":   codigoGenerado,
	})
}

// RegistrarSalida registra la salida de una unidad del inventario
// (usada o caducada): cambia su estado a "Entregada" o "Caducada".
// POST /api/unidades/{id|folio}/salida  { "motivo": "usada" | "caducada" }
// Requiere token. Quien puede registrar unidades puede registrar salidas:
// la unidad debe ser de la institución del usuario (admin_general: de
// cualquiera). Al cambiar el estado, la unidad deja de contar como
// disponible en Dashboard/Stock (todos los conteos filtran 'disponible').
func RegistrarSalida(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}
	sesion, ok := sesionDesdeToken(r)
	if !ok {
		http.Error(w, "Token de autorización requerido", http.StatusUnauthorized)
		return
	}
	// /api/unidades/{id}/salida -> identificador = {id} (numérico o folio UN-XXXX).
	rest := strings.TrimPrefix(r.URL.Path, "/api/unidades/")
	identificador := strings.Trim(strings.TrimSuffix(rest, "/salida"), "/")
	if identificador == "" || strings.Contains(identificador, "/") {
		http.Error(w, "Ruta inválida: se espera /api/unidades/{id}/salida", http.StatusBadRequest)
		return
	}
	var input struct {
		Motivo string `json:"motivo"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Error al leer los datos de la salida", http.StatusBadRequest)
		return
	}
	// "usada" -> Entregada, "caducada" -> Caducada (comparación sin acentos).
	motivo := normalizarNombre(input.Motivo)
	estadoNombre := ""
	switch motivo {
	case "usada", "usado", "utilizada", "utilizado":
		estadoNombre = "Entregada"
	case "caducada", "caducado", "vencida", "vencido":
		estadoNombre = "Caducada"
	default:
		http.Error(w, "Motivo no válido: usa \"usada\" o \"caducada\"", http.StatusBadRequest)
		return
	}
	// El estado se resuelve por nombre, tolerante a acentos (mismo
	// enfoque que resolvePorPatron). Si no existe en la BD, 400 claro.
	estadoID, err := resolvePorPatron("estados_hemocomponente", "%"+estadoNombre+"%")
	if err != nil {
		http.Error(w, "El estado '"+estadoNombre+"' no existe en la base de datos. Siembra los estados de hemocomponente (Reservada, Entregada, Por caducar, Caducada).", http.StatusBadRequest)
		return
	}
	// Buscar la unidad por id numérico o por código (folio UN-XXXX).
	var unidadID, unidadInstID int
	var codigoUnidad, estadoActual string
	var errBuscar error
	consultaUnidad := `
		SELECT h.id, h.institucion_id, h.codigo_unidad, eh.nombre
		FROM hemocomponentes h JOIN estados_hemocomponente eh ON eh.id = h.estado_id
		WHERE %s = $1`
	if _, errNum := strconv.Atoi(identificador); errNum == nil {
		errBuscar = database.DB.QueryRow(fmt.Sprintf(consultaUnidad, "h.id"), identificador).Scan(&unidadID, &unidadInstID, &codigoUnidad, &estadoActual)
	} else {
		errBuscar = database.DB.QueryRow(fmt.Sprintf(consultaUnidad, "h.codigo_unidad"), identificador).Scan(&unidadID, &unidadInstID, &codigoUnidad, &estadoActual)
	}
	if errBuscar != nil {
		http.Error(w, "Unidad no encontrada", http.StatusNotFound)
		return
	}
	// Solo su institución (admin_general: cualquiera).
	if sesion.RolID != 1 {
		if sesion.InstitucionID == nil || unidadInstID != *sesion.InstitucionID {
			http.Error(w, "No puedes registrar la salida de una unidad de otra institución", http.StatusForbidden)
			return
		}
	}
	// Solo se puede dar salida a una unidad Disponible.
	if normalizarNombre(estadoActual) != "disponible" {
		http.Error(w, "La unidad ya no está disponible (estado actual: "+estadoActual+")", http.StatusBadRequest)
		return
	}
	if _, err := database.DB.Exec(`UPDATE hemocomponentes SET estado_id = $1 WHERE id = $2`, estadoID, unidadID); err != nil {
		log.Printf("Error al registrar salida de unidad %d: %v", unidadID, err)
		http.Error(w, "Error al registrar la salida de la unidad", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"mensaje": "Salida registrada con éxito",
		"id":      unidadID,
		"folio":   codigoUnidad,
		"estado":  estadoNombre,
		"motivo":  motivo,
	})
}

func GetInstituciones(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Tu consulta a la base de datos aquí...
	rows, err := database.DB.Query("SELECT id, nombre FROM instituciones ORDER BY nombre")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type Institucion struct {
		ID     int    `json:"id"`
		Nombre string `json:"nombre"`
	}

	lista := []Institucion{}
	for rows.Next() {
		var i Institucion
		if err := rows.Scan(&i.ID, &i.Nombre); err != nil {
			continue
		}
		lista = append(lista, i)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(lista)
}

// findOrCreateColonia busca una colonia por (nombre, codigo_postal) y la
// crea si no existe (la UNIQUE de colonias evita duplicados). Devuelve su id.
func findOrCreateColonia(nombre, codigoPostal string) (int, error) {
	var id int
	err := database.DB.QueryRow(`
		INSERT INTO colonias (nombre, codigo_postal) VALUES ($1, $2)
		ON CONFLICT (nombre, codigo_postal) DO NOTHING
		RETURNING id`, nombre, codigoPostal).Scan(&id)
	if err == nil {
		return id, nil
	}
	// Ya existía (DO NOTHING no devolvió fila): buscar su id.
	err2 := database.DB.QueryRow(
		`SELECT id FROM colonias WHERE nombre = $1 AND codigo_postal = $2`,
		nombre, codigoPostal).Scan(&id)
	if err2 != nil {
		return 0, err2
	}
	return id, nil
}

// RegistrarInstitucion atiende la ruta POST /api/instituciones
func RegistrarInstitucion(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}

	// 1. Validar token y rol de Admin General...
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		http.Error(w, "Token de autorización requerido", http.StatusUnauthorized)
		return
	}
	tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
	claims := &claims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
		return jwtKey, nil
	})
	if err != nil || !token.Valid || claims.RolID != 1 {
		http.Error(w, "Acceso denegado", http.StatusForbidden)
		return
	}

	// 2. Estructura que incluye colonia_id
	var input struct {
		Nombre            string `json:"nombre"`
		TipoInstitucionID int    `json:"tipo_institucion_id"`
		ColoniaID         int    `json:"colonia_id"`
		ColoniaNombre     string `json:"colonia_nombre"`
		CodigoPostal      string `json:"codigo_postal"`
		Telefono          string `json:"telefono"`
		CalleNumero       string `json:"calle_numero"`
		Activo            *bool  `json:"activo"`
	}

	err = json.NewDecoder(r.Body).Decode(&input)
	if err != nil {
		http.Error(w, "Error al leer los datos", http.StatusBadRequest)
		return
	}

	// 3. Resolver la colonia (regla documentada):
	// - Si viene colonia_nombre no vacío, se busca/crea una colonia con ese
	//   nombre + código postal (ON CONFLICT no duplica) y se usa su id.
	// - Si viene colonia_id Y codigo_postal distinto al CP almacenado de esa
	//   colonia, NO se sobrescribe: se crea una colonia nueva con el mismo
	//   nombre y el nuevo CP (misma lógica find-or-create) y se usa su id.
	// - Si viene solo colonia_id, comportamiento actual.
	coloniaID := input.ColoniaID
	if strings.TrimSpace(input.ColoniaNombre) != "" {
		cp := strings.TrimSpace(input.CodigoPostal)
		if cp == "" {
			http.Error(w, "El código postal es obligatorio para una colonia nueva", http.StatusBadRequest)
			return
		}
		id, errCol := findOrCreateColonia(strings.TrimSpace(input.ColoniaNombre), cp)
		if errCol != nil {
			log.Printf("Error al resolver colonia nueva: %v", errCol)
			http.Error(w, "Error al registrar la colonia: "+errCol.Error(), http.StatusInternalServerError)
			return
		}
		coloniaID = id
	} else if coloniaID != 0 && strings.TrimSpace(input.CodigoPostal) != "" {
		var nombreCol, cpActual string
		errCol := database.DB.QueryRow(`SELECT nombre, codigo_postal FROM colonias WHERE id = $1`, coloniaID).Scan(&nombreCol, &cpActual)
		if errCol == nil && cpActual != strings.TrimSpace(input.CodigoPostal) {
			id, errCol2 := findOrCreateColonia(nombreCol, strings.TrimSpace(input.CodigoPostal))
			if errCol2 != nil {
				log.Printf("Error al crear colonia con nuevo CP: %v", errCol2)
				http.Error(w, "Error al registrar la colonia: "+errCol2.Error(), http.StatusInternalServerError)
				return
			}
			coloniaID = id
		}
	}
	if coloniaID == 0 {
		http.Error(w, "Se requiere una colonia (colonia_id o colonia_nombre)", http.StatusBadRequest)
		return
	}

	activo := true
	if input.Activo != nil {
		activo = *input.Activo
	}
	var nuevoID int
	query := `
		INSERT INTO instituciones (nombre, tipo_institucion_id, colonia_id, telefono, calle_numero, activo)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id
	`
	err = database.DB.QueryRow(query, input.Nombre, input.TipoInstitucionID, coloniaID, input.Telefono, input.CalleNumero, activo).Scan(&nuevoID)
	if err != nil {
		log.Printf("Error al registrar institución en BD: %v", err)
		http.Error(w, "Error al registrar la institución en la base de datos: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Colonia resuelta (nueva o existente): se devuelve para que el
	// frontend pueda añadirla a su lista sin esperar a recargar el
	// catálogo (ver ModalRegistrarInsti: tras guardar, la colonia recién
	// creada ya es elegible para el siguiente hospital).
	var colNombre, colCP string
	_ = database.DB.QueryRow(`SELECT nombre, codigo_postal FROM colonias WHERE id = $1`, coloniaID).Scan(&colNombre, &colCP)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"mensaje": "Institución registrada con éxito",
		"id":      nuevoID,
		"colonia": map[string]interface{}{
			"id":            coloniaID,
			"nombre":        colNombre,
			"codigo_postal": colCP,
		},
	})
}

// 1. Obtener los usuarios registrados (con el nombre de su institución y rol).
// Ámbito por rol (el filtro lo aplica el backend, no el frontend):
//   - admin general (rol_id 1): todos los usuarios.
//   - admin institucional (rol_id 2): solo los que ÉL creó (creado_por = su id);
//     si no ha creado ninguno, la lista viene vacía.
//   - personal médico (rol_id 3): 403, este módulo es solo de administradores.
func GetUsuarios(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}

	sesion, ok := sesionDesdeToken(r)
	if !ok {
		http.Error(w, "Token de autorización requerido", http.StatusUnauthorized)
		return
	}

	query := `
		SELECT u.id, u.nombre, u.email,
		       COALESCE(r.nombre, 'Sin Rol') as rol,
		       COALESCE(i.nombre, 'Sin Institución') as institucion,
		       u.institucion_id,
		       u.estado, u.created_at
		FROM usuarios u
		LEFT JOIN roles r ON u.rol_id = r.id
		LEFT JOIN instituciones i ON u.institucion_id = i.id
	`
	var args []interface{}
	switch {
	case sesion.RolID == 1:
		// Sin filtro: el admin general ve a todos.
	case sesion.RolID == 2:
		query += ` WHERE u.creado_por = $1`
		args = append(args, sesion.ID)
	default:
		http.Error(w, "Este módulo es solo para administradores", http.StatusForbidden)
		return
	}
	query += ` ORDER BY u.id DESC`

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		log.Printf("Error al consultar usuarios en BD: %v", err)
		http.Error(w, "Error al obtener usuarios: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type UsuarioResponse struct {
		ID          int    `json:"id"`
		Nombre      string `json:"nombre"`
		Email       string `json:"email"`
		Rol           string `json:"rol"`
		Institucion   string `json:"institucion"`
		InstitucionID *int   `json:"institucion_id"`
		Activo        bool   `json:"activo"`
		CreatedAt   string `json:"created_at"`
	}

	var usuarios []UsuarioResponse
	for rows.Next() {
		var u UsuarioResponse
		var createdAt sql.NullString // Para manejar timestamps de forma segura
		var instID sql.NullInt64
		err := rows.Scan(&u.ID, &u.Nombre, &u.Email, &u.Rol, &u.Institucion, &instID, &u.Activo, &createdAt)
		if instID.Valid {
			v := int(instID.Int64)
			u.InstitucionID = &v
		}
		if err != nil {
			log.Printf("Error escaneando usuario: %v", err)
			continue
		}
		if createdAt.Valid {
			u.CreatedAt = createdAt.String
		} else {
			u.CreatedAt = "N/A"
		}
		usuarios = append(usuarios, u)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(usuarios)
}

// 2. Eliminar un usuario por su ID (admin general: cualquiera;
// admin institucional: solo los que él creó; personal médico: prohibido).
func EliminarUsuario(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}

	sesion, ok := sesionDesdeToken(r)
	if !ok {
		http.Error(w, "Token de autorización requerido", http.StatusUnauthorized)
		return
	}
	if sesion.RolID == 3 {
		http.Error(w, "Acceso denegado", http.StatusForbidden)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/usuarios/")
	userID := strings.TrimSpace(path)

	if userID == "" {
		http.Error(w, "ID de usuario inválido", http.StatusBadRequest)
		return
	}

	// Todo en una transacción: si algo falla, no queda el usuario a
	// medias (p. ej. sin solicitudes pero sin borrar).
	tx, err := database.DB.Begin()
	if err != nil {
		http.Error(w, "Error al eliminar el usuario en la base de datos", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// 0. El usuario debe existir y, si quien borra es admin institucional
	// (rol 2), debe ser uno que ÉL creó. Se comprueba ANTES de limpiar
	// nada: si no es suyo, no se toca ningún dependiente.
	var creadoPor sql.NullInt64
	err = tx.QueryRow(`SELECT creado_por FROM usuarios WHERE id = $1`, userID).Scan(&creadoPor)
	if err != nil {
		http.Error(w, "Usuario no encontrado", http.StatusNotFound)
		return
	}
	if sesion.RolID == 2 && (!creadoPor.Valid || int(creadoPor.Int64) != sesion.ID) {
		http.Error(w, "Usuario no encontrado", http.StatusNotFound)
		return
	}

	// 1. Dependientes que impiden el DELETE por llave foránea. Antes solo
	// se limpiaban las solicitudes donde era solicitante, así que borrar
	// a un usuario sin institución —o con notificaciones, auditoría,
	// respuestas o usuarios creados— fallaba con error 500:
	// - notificaciones dirigidas a él (usuario_id NOT NULL).
	// - registros de auditoría suyos.
	// - respuestas suyas: quedan en NULL (la solicitud y su asignación
	//   siguen existiendo, solo pierden el autor).
	// - usuarios que él creó: quedan sin creador (los sigue viendo solo
	//   el admin general).
	// - solicitudes donde es solicitante: se eliminan (como antes).
	limpiezas := []string{
		`DELETE FROM notificaciones WHERE usuario_id = $1`,
		`DELETE FROM auditoria_logs WHERE usuario_id = $1`,
		`UPDATE asignaciones_unidades SET usuario_responde_id = NULL WHERE usuario_responde_id = $1`,
		`UPDATE solicitudes_emergencia SET usuario_responde_id = NULL WHERE usuario_responde_id = $1`,
		`UPDATE usuarios SET creado_por = NULL WHERE creado_por = $1`,
		`DELETE FROM solicitudes_emergencia WHERE usuario_solicitante_id = $1`,
	}
	for _, q := range limpiezas {
		if _, err := tx.Exec(q, userID); err != nil {
			log.Printf("Error al limpiar dependientes del usuario %s: %v", userID, err)
			http.Error(w, "Error al eliminar el usuario en la base de datos", http.StatusInternalServerError)
			return
		}
	}

	// 2. Borrar físicamente al usuario.
	result, err := tx.Exec(`DELETE FROM usuarios WHERE id = $1`, userID)
	if err != nil {
		log.Printf("Error al eliminar usuario en BD: %v", err)
		http.Error(w, "Error al eliminar el usuario en la base de datos", http.StatusInternalServerError)
		return
	}
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "Usuario no encontrado", http.StatusNotFound)
		return
	}

	if err := tx.Commit(); err != nil {
		log.Printf("Error al confirmar eliminación de usuario: %v", err)
		http.Error(w, "Error al eliminar el usuario en la base de datos", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"mensaje": "Usuario eliminado permanentemente"})
}

// 3. Dar de baja o reactivar un usuario (admin general: cualquiera;
// admin institucional: solo los que él creó; personal médico: prohibido).
// PATCH /api/usuarios/{id}/estado  { "estado": true|false }
// El usuario dado de baja sigue en la lista (para poder reactivarlo) y
// el Login lo rechaza (ver Login): no puede entrar hasta reactivarlo.
func CambiarEstadoUsuario(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}

	sesion, ok := sesionDesdeToken(r)
	if !ok {
		http.Error(w, "Token de autorización requerido", http.StatusUnauthorized)
		return
	}
	if sesion.RolID == 3 {
		http.Error(w, "Acceso denegado", http.StatusForbidden)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/usuarios/")
	userID := strings.Trim(strings.TrimSuffix(path, "/estado"), "/")
	if userID == "" || strings.Contains(userID, "/") {
		http.Error(w, "ID de usuario inválido", http.StatusBadRequest)
		return
	}

	var input struct {
		Estado *bool `json:"estado"`
		Activo *bool `json:"activo"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Error al leer los datos", http.StatusBadRequest)
		return
	}
	nuevoEstado := input.Estado
	if nuevoEstado == nil {
		nuevoEstado = input.Activo
	}
	if nuevoEstado == nil {
		http.Error(w, "Se requiere el campo estado (true para reactivar, false para dar de baja)", http.StatusBadRequest)
		return
	}

	// Un admin institucional solo puede cambiar el estado de los usuarios
	// que él creó (misma regla que EliminarUsuario).
	var query string
	var args []interface{}
	if sesion.RolID == 2 {
		query = `UPDATE usuarios SET estado = $1 WHERE id = $2 AND creado_por = $3`
		args = []interface{}{*nuevoEstado, userID, sesion.ID}
	} else {
		query = `UPDATE usuarios SET estado = $1 WHERE id = $2`
		args = []interface{}{*nuevoEstado, userID}
	}
	result, err := database.DB.Exec(query, args...)
	if err != nil {
		log.Printf("Error al cambiar estado del usuario %s: %v", userID, err)
		http.Error(w, "Error al actualizar el estado del usuario", http.StatusInternalServerError)
		return
	}
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "Usuario no encontrado", http.StatusNotFound)
		return
	}

	mensaje := "Usuario dado de baja"
	if *nuevoEstado {
		mensaje = "Usuario reactivado"
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"mensaje": mensaje,
		"estado":  *nuevoEstado,
	})
}
