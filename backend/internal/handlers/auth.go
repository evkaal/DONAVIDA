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

	// Encriptar la contraseña con bcrypt
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Error al encriptar la contraseña", http.StatusInternalServerError)
		return
	}

	// Insertar en la base de datos vinculando la institución correspondiente
	query := `INSERT INTO usuarios (nombre, email, password_hash, rol_id, institucion_id, estado) VALUES ($1, $2, $3, $4, $5, true)`
	_, err = database.DB.Exec(query, input.Nombre, input.Email, string(hashedPassword), input.RolID, input.InstitucionId)
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
	var institucionID sql.NullInt64
	var institucionNombre sql.NullString

	query := `SELECT u.nombre, u.password_hash, u.rol_id, u.institucion_id, i.nombre
		FROM usuarios u
		LEFT JOIN instituciones i ON u.institucion_id = i.id
		WHERE u.email = $1`
	err = database.DB.QueryRow(query, input.Email).Scan(&nombreUsuario, &storedHash, &rolID, &institucionID, &institucionNombre)

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

	// 1. Obtener el parámetro de institución de la URL (ej. ?institucion_id=1)
	institucionParam := r.URL.Query().Get("institucion_id")
	var instID int = 0
	if institucionParam != "" {
		fmt.Sscanf(institucionParam, "%d", &instID)
	}

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

	// 5. Niveles críticos
	err = database.DB.QueryRow(`
		SELECT COUNT(u.id) 
		FROM umbrales_stock u
		WHERE ($1 = 0 OR u.institucion_id = $1) AND (
			SELECT COUNT(h.id) 
			FROM hemocomponentes h
			JOIN estados_hemocomponente eh ON h.estado_id = eh.id
			WHERE h.institucion_id = u.institucion_id 
			  AND h.tipo_sangre_id = u.tipo_sangre_id 
			  AND h.tipo_hemocomponente_id = u.tipo_hemocomponente_id
			  AND eh.nombre ILIKE 'disponible'
		) <= u.stock_minimo
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

// 1. Obtener stock agrupado por tipo sanguíneo para la gráfica
// 1. Obtener stock agrupado por tipo sanguíneo para la gráfica
func GetStockPorTipo(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}

	rows, err := database.DB.Query(`
        SELECT ts.grupo_abo || ts.factor_rh AS tipo, 
               COUNT(h.id) AS cantidad
        FROM tipos_sangre ts
        LEFT JOIN hemocomponentes h ON ts.id = h.tipo_sangre_id 
        LEFT JOIN estados_hemocomponente eh ON h.estado_id = eh.id AND eh.nombre ILIKE 'disponible'
        GROUP BY ts.grupo_abo, ts.factor_rh
        ORDER BY tipo;
    `)
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
	for rows.Next() {
		var s StockTipo
		if err := rows.Scan(&s.Tipo, &s.Cantidad); err != nil {
			continue
		}
		s.EsCritico = s.Cantidad <= 10
		stockList = append(stockList, s)
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
	Codigo          string `json:"codigo"`
	TipoSangre      string `json:"tipoSangre"`     // Ej: "O+"
	Hemocomponente  string `json:"hemocomponente"` // Ej: "Concentrado eritrocitario"
	Volumen         string `json:"volumen"`
	FechaExtraccion string `json:"fechaExtraccion"`
	FechaCaducidad  string `json:"fechaCaducidad"`
	Estado          string `json:"estado"` // "Disponible"
	InstitucionID   int    `json:"institucion_id"`
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

	// 2. Obtener el ID del tipo de hemocomponente por su columna `componente`
	// (no `nombre`): primero exacto, luego por patrón ("Plasma fresco"
	// encuentra "Plasma fresco congelado").
	var tipoHemocomponenteID int
	err = database.DB.QueryRow(`
		SELECT id FROM tipos_hemocomponente WHERE componente ILIKE $1 ORDER BY LENGTH(componente) ASC LIMIT 1
	`, input.Hemocomponente).Scan(&tipoHemocomponenteID)
	if err != nil {
		err = database.DB.QueryRow(`
			SELECT id FROM tipos_hemocomponente WHERE componente ILIKE $1 ORDER BY LENGTH(componente) ASC LIMIT 1
		`, "%"+input.Hemocomponente+"%").Scan(&tipoHemocomponenteID)
	}
	if err != nil {
		tipoHemocomponenteID = 1
	}

	// 3. Obtener el ID del estado (ej. "Disponible")
	var estadoID int
	err = database.DB.QueryRow(`
		SELECT id FROM estados_hemocomponente WHERE nombre ILIKE $1
	`, input.Estado).Scan(&estadoID)
	if err != nil {
		estadoID = 1
	}

	// 4. Insertar en la tabla hemocomponentes (sin el campo volumen que no existe en la BD)
	query := `
		INSERT INTO hemocomponentes 
		(codigo_unidad, tipo_sangre_id, tipo_hemocomponente_id, estado_id, institucion_id, fecha_extraccion, fecha_caducidad)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`
	var nuevoID int
	err = database.DB.QueryRow(
		query,
		input.Codigo,
		tipoSangreID,
		tipoHemocomponenteID,
		estadoID,
		input.InstitucionID,
		input.FechaExtraccion,
		input.FechaCaducidad,
	).Scan(&nuevoID)

	if err != nil {
		log.Printf("Error al insertar unidad en BD: %v", err)
		http.Error(w, "Error al registrar la unidad en la base de datos: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"mensaje": "Unidad registrada con éxito en la BD",
		"id":      nuevoID,
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
		Telefono          string `json:"telefono"`
		CalleNumero       string `json:"calle_numero"`
		Activo            *bool  `json:"activo"`
	}

	err = json.NewDecoder(r.Body).Decode(&input)
	if err != nil {
		http.Error(w, "Error al leer los datos", http.StatusBadRequest)
		return
	}

	// 3. Inserción con colonia_id incluido
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
	err = database.DB.QueryRow(query, input.Nombre, input.TipoInstitucionID, input.ColoniaID, input.Telefono, input.CalleNumero, activo).Scan(&nuevoID)
	if err != nil {
		log.Printf("Error al registrar institución en BD: %v", err)
		http.Error(w, "Error al registrar la institución en la base de datos: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"mensaje": "Institución registrada con éxito",
		"id":      nuevoID,
	})
}

// 1. Obtener todos los usuarios registrados (con el nombre de su institución y rol)
func GetUsuarios(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}

	query := `
		SELECT u.id, u.nombre, u.email, 
		       COALESCE(r.nombre, 'Sin Rol') as rol, 
		       COALESCE(i.nombre, 'Sin Institución') as institucion, 
		       u.estado, u.created_at
		FROM usuarios u
		LEFT JOIN roles r ON u.rol_id = r.id
		LEFT JOIN instituciones i ON u.institucion_id = i.id
		ORDER BY u.id DESC
	`
	rows, err := database.DB.Query(query)
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
		Rol         string `json:"rol"`
		Institucion string `json:"institucion"`
		Activo      bool   `json:"activo"`
		CreatedAt   string `json:"created_at"`
	}

	var usuarios []UsuarioResponse
	for rows.Next() {
		var u UsuarioResponse
		var createdAt sql.NullString // Para manejar timestamps de forma segura
		err := rows.Scan(&u.ID, &u.Nombre, &u.Email, &u.Rol, &u.Institucion, &u.Activo, &createdAt)
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

// 2. Eliminar un usuario por su ID (Exclusivo Admin General)
func EliminarUsuario(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/usuarios/")
	userID := strings.TrimSpace(path)

	if userID == "" {
		http.Error(w, "ID de usuario inválido", http.StatusBadRequest)
		return
	}

	// 1. Eliminar primero los registros dependientes en solicitudes_emergencia (si aplica)
	_, err := database.DB.Exec(`DELETE FROM solicitudes_emergencia WHERE usuario_solicitante_id = $1`, userID)
	if err != nil {
		log.Printf("Advertencia al limpiar solicitudes del usuario: %v", err)
		// Puedes decidir si continuar o retornar error
	}

	// 2. Ahora procedemos a borrar físicamente al usuario de la base de datos
	query := `DELETE FROM usuarios WHERE id = $1`
	result, err := database.DB.Exec(query, userID)
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

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"mensaje": "Usuario eliminado permanentemente"})
}
