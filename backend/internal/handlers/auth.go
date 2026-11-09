package handlers

import (
	"donavida-backend/internal/database"
	"encoding/json"
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
		log.Fatal("Fatal: la variable de entorno JWT_Secret no esta definida")
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

	var input usuarioInput
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

	// Insertar en la base de datos
	query := `INSERT INTO usuarios (nombre, email, password_hash, rol_id, institucion_id) VALUES ($1, $2, $3, $4, $5)`
	_, err = database.DB.Exec(query, input.Nombre, input.Email, string(hashedPassword), input.RolID, input.InstitucionId)
	if err != nil {
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

	fmt.Printf("verificado login -> Email: '%s', RolID enviado: %d\n", input.Email, input.RolID)

	// 1. Buscar el usuario en la base de datos por su email y rol
	var storedHash string
	var nombreUsuario string
	var rolID int

	query := `SELECT nombre, password_hash, rol_id FROM usuarios WHERE email = $1 AND rol_id = $2`
	err = database.DB.QueryRow(query, input.Email, input.RolID).Scan(&nombreUsuario, &storedHash, &rolID)

	if err != nil {
		http.Error(w, "Correo, contraseña o rol incorrecto", http.StatusUnauthorized)
		return
	}
	fmt.Printf("Intentando login para: %s con contraseña ingresada: %s\n", input.Email, input.Password)

	// 2. Comparar la contraseña
	err = bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(input.Password))
	if err != nil {
		http.Error(w, "Correo, contraseña o rol incorrecto", http.StatusUnauthorized)
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
		log.Printf("Error detallado al firmar el token: %v", err)
		http.Error(w, "Error al generar el token de acceso", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"mensaje": "Login exitoso",
		"token":   tokenString,
		"nombre":  nombreUsuario,
		"email":   input.Email,
		"rol_id":  rolID,
	})
}

// Función GetDashboardStats para atender la ruta /api/dashboard/stats
func GetDashboardStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Metodo no permitido", http.StatusMethodNotAllowed)
		return
	}

	var uniDisponibles, proxCaducar, SolPendientes, nivCriticos int

	// 1. Unidades disponibles (Usando LEFT JOIN por seguridad, igual que GetStockPorTipo)
	err := database.DB.QueryRow(`
        SELECT COUNT(h.id) FROM hemocomponentes h
        JOIN estados_hemocomponente e ON h.estado_id = e.id
        WHERE e.nombre ILIKE 'disponible'
    `).Scan(&uniDisponibles)
	if err != nil {
		log.Printf("Error al consultar unidades disponibles: %v", err)
	}

	// 2. Próximas a caducar
	err = database.DB.QueryRow(`
        SELECT COUNT(h.id) FROM hemocomponentes h 
        JOIN estados_hemocomponente e ON h.estado_id = e.id
        WHERE e.nombre ILIKE 'disponible'
          AND h.fecha_caducidad BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
    `).Scan(&proxCaducar)
	if err != nil {
		log.Printf("Error al consultar las unidades a caducar: %v", err)
	}

	// 3. Solicitudes pendientes (Protegida por si la tabla de solicitudes aún está vacía o en desarrollo)
	err = database.DB.QueryRow(`
        SELECT COUNT(s.id) FROM solicitudes_emergencia s
        JOIN estados_solicitud e ON s.estado_id = e.id
        WHERE e.nombre ILIKE 'pendiente'
    `).Scan(&SolPendientes)
	if err != nil {
		log.Printf("Error al consultar las solicitudes pendientes (puede que la tabla esté vacía): %v", err)
		SolPendientes = 0
	}

	// 4. Niveles críticos (Protegida por si la tabla umbrales_stock no se usa en este sprint)
	err = database.DB.QueryRow(`
        SELECT COUNT(u.id) 
        FROM umbrales_stock u
        WHERE (
            SELECT COUNT(h.id) 
            FROM hemocomponentes h
            JOIN estados_hemocomponente eh ON h.estado_id = eh.id
            WHERE h.institucion_id = u.institucion_id 
              AND h.tipo_sangre_id = u.tipo_sangre_id 
              AND h.tipo_hemocomponente_id = u.tipo_hemocomponente_id
              AND eh.nombre ILIKE 'disponible'
        ) <= u.stock_minimo
    `).Scan(&nivCriticos)
	if err != nil {
		log.Printf("Aviso: umbrales_stock no configurado o con error: %v", err)
		nivCriticos = 0
	}

	// Respondemos con el JSON estructurado exactamente como lo espera dashboardService.js
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
