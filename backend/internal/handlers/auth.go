package handlers

import (
	"database/sql"
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
		secret = "donavida_secret_key_jwt_2026"
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

	fmt.Printf("Intento de login para email: '%s'\n", input.Email)

	// 1. Buscar el usuario en la base de datos únicamente por su email (detección automática de rol)
	var storedHash string
	var nombreUsuario string
	var rolID int
	var institucionID sql.NullInt64
	var institucionNombre sql.NullString

	query := `
		SELECT u.nombre, u.password_hash, u.rol_id, u.institucion_id, i.nombre
		FROM usuarios u
		LEFT JOIN instituciones i ON u.institucion_id = i.id
		WHERE u.email = $1
	`
	err = database.DB.QueryRow(query, input.Email).Scan(&nombreUsuario, &storedHash, &rolID, &institucionID, &institucionNombre)

	if err != nil {
		http.Error(w, "Correo o contraseña incorrectos", http.StatusUnauthorized)
		return
	}

	// 2. Comparar la contraseña
	err = bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(input.Password))
	if err != nil {
		http.Error(w, "Correo o contraseña incorrectos", http.StatusUnauthorized)
		return
	}

	// 3. Generar el Token JWT con el rolID detectado automáticamente
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

	// Mapeo amigable de rol según rol_id (1: Admin general, 2: Admin institución, 3: Personal médico)
	var rolStr string
	switch rolID {
	case 1:
		rolStr = "admin_gen"
	case 2:
		rolStr = "admin_ins"
	case 3:
		rolStr = "medico"
	default:
		rolStr = "medico"
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"mensaje":        "Login exitoso",
		"token":          tokenString,
		"nombre":         nombreUsuario,
		"email":          input.Email,
		"correo":         input.Email,
		"rol_id":         rolID,
		"rol":            rolStr,
		"institucion_id": institucionID.Int64,
		"institucion":    institucionNombre.String,
	})
}

// actualizarEstadosCaducados actualiza a 'Caducado' las unidades cuya fecha de caducidad ya pasó
func actualizarEstadosCaducados() {
	_, err := database.DB.Exec(`
		UPDATE hemocomponentes
		SET estado_id = (SELECT id FROM estados_hemocomponente WHERE nombre ILIKE 'caducado' LIMIT 1)
		WHERE fecha_caducidad < CURRENT_DATE
		  AND estado_id = (SELECT id FROM estados_hemocomponente WHERE nombre ILIKE 'disponible' LIMIT 1)
	`)
	if err != nil {
		log.Printf("Aviso al actualizar unidades caducadas: %v", err)
	}
}

// Función GetDashboardStats para atender la ruta /api/dashboard/stats
func GetDashboardStats(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet {
        http.Error(w, "Metodo no permitido", http.StatusMethodNotAllowed)
        return
    }

    // Actualizamos automáticamente las unidades vencidas
    actualizarEstadosCaducados()

    var uniDisponibles, proxCaducar, SolPendientes, nivCriticos, totalUsuarios int

    // 1. Unidades disponibles (únicamente no caducadas)
    err := database.DB.QueryRow(`
        SELECT COUNT(h.id) FROM hemocomponentes h
        JOIN estados_hemocomponente e ON h.estado_id = e.id
        WHERE e.nombre ILIKE 'disponible' AND h.fecha_caducidad >= CURRENT_DATE
    `).Scan(&uniDisponibles)
    if err != nil {
        log.Printf("Error al consultar unidades disponibles: %v", err)
    }

    // 2. Próximas a caducar (dentro de los próximos 7 días a partir de hoy)
    err = database.DB.QueryRow(`
        SELECT COUNT(h.id) FROM hemocomponentes h 
        JOIN estados_hemocomponente e ON h.estado_id = e.id
        WHERE e.nombre ILIKE 'disponible'
          AND h.fecha_caducidad BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
    `).Scan(&proxCaducar)
    if err != nil {
        log.Printf("Error al consultar las unidades a caducar: %v", err)
    }

    // 3. Solicitudes pendientes
    err = database.DB.QueryRow(`
        SELECT COUNT(s.id) FROM solicitudes_emergencia s
        JOIN estados_solicitud e ON s.estado_id = e.id
        WHERE e.nombre ILIKE 'pendiente'
    `).Scan(&SolPendientes)
    if err != nil {
        log.Printf("Error al consultar las solicitudes pendientes: %v", err)
        SolPendientes = 0
    }

    // 4. Niveles críticos: verificar umbrales de stock
    var countUmbrales int
    _ = database.DB.QueryRow(`SELECT COUNT(*) FROM umbrales_stock`).Scan(&countUmbrales)

    if countUmbrales > 0 {
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
                  AND h.fecha_caducidad >= CURRENT_DATE
            ) <= u.stock_minimo
        `).Scan(&nivCriticos)
        if err != nil {
            log.Printf("Aviso: umbrales_stock con error: %v", err)
            nivCriticos = 0
        }
    } else {
        // Fallback: si no hay umbrales_stock, contamos tipos sanguíneos con stock disponible <= 10
        _ = database.DB.QueryRow(`
            SELECT COUNT(*) FROM (
                SELECT ts.id
                FROM tipos_sangre ts
                LEFT JOIN hemocomponentes h ON ts.id = h.tipo_sangre_id AND h.fecha_caducidad >= CURRENT_DATE
                LEFT JOIN estados_hemocomponente eh ON h.estado_id = eh.id AND eh.nombre ILIKE 'disponible'
                GROUP BY ts.id
                HAVING COUNT(eh.id) <= 10
            ) c
        `).Scan(&nivCriticos)
    }

    // 5. Total de usuarios registrados (para rol Administrador)
    err = database.DB.QueryRow(`SELECT COUNT(id) FROM usuarios`).Scan(&totalUsuarios)
    if err != nil {
        totalUsuarios = 0
    }

    // Respondemos con el JSON estructurado para el dashboard
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]int{
        "totalUnidades":         uniDisponibles,
        "proximasCaducar":       proxCaducar,
        "solicitudesPendientes": SolPendientes,
        "nivelesCriticos":       nivCriticos,
        "totalUsuarios":         totalUsuarios,
    })
}
// 1. Obtener stock agrupado por tipo sanguíneo para la gráfica
func GetStockPorTipo(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet {
        http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
        return
    }

    actualizarEstadosCaducados()

    rows, err := database.DB.Query(`
        SELECT ts.grupo_abo || ts.factor_rh AS tipo, 
               COUNT(eh.id) AS cantidad
        FROM tipos_sangre ts
        LEFT JOIN hemocomponentes h ON ts.id = h.tipo_sangre_id AND h.fecha_caducidad >= CURRENT_DATE
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





// RegistrarUnidad atiende la ruta /api/unidades (GET para listar, POST para registrar)
type UnidadInput struct {
	Codigo           string `json:"codigo"`
	TipoSangre       string `json:"tipoSangre"`       // Ej: "O+"
	Hemocomponente   string `json:"hemocomponente"`   // Ej: "Concentrado eritrocitario"
	Volumen          string `json:"volumen"`
	FechaExtraccion  string `json:"fechaExtraccion"`
	FechaCaducidad   string `json:"fechaCaducidad"`
	Estado           string `json:"estado"`           // "Disponible"
	InstitucionID    int    `json:"institucion_id"`
}

// GetUnidades atiende GET /api/unidades devolviendo la lista de hemocomponentes registrados
func GetUnidades(w http.ResponseWriter, r *http.Request) {
	actualizarEstadosCaducados()

	rows, err := database.DB.Query(`
		SELECT h.id, h.codigo_unidad, 
		       ts.grupo_abo || ts.factor_rh AS tipo_sangre,
		       th.componente AS hemocomponente,
		       to_char(h.fecha_extraccion, 'YYYY-MM-DD') AS fecha_extraccion,
		       to_char(h.fecha_caducidad, 'YYYY-MM-DD') AS fecha_caducidad,
		       eh.nombre AS estado
		FROM hemocomponentes h
		JOIN tipos_sangre ts ON h.tipo_sangre_id = ts.id
		JOIN tipos_hemocomponente th ON h.tipo_hemocomponente_id = th.id
		JOIN estados_hemocomponente eh ON h.estado_id = eh.id
		ORDER BY h.id DESC
	`)
	if err != nil {
		log.Printf("Error al consultar unidades: %v", err)
		http.Error(w, "Error al consultar unidades", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type UnidadItem struct {
		ID           int    `json:"id"`
		Folio        string `json:"folio"`
		Tipo         string `json:"tipo"`
		Hemocomponente string `json:"hemocomponente"`
		FechaIngreso string `json:"fechaIngreso"`
		Caducidad    string `json:"caducidad"`
		Estado       string `json:"estado"`
	}

	var lista []UnidadItem
	for rows.Next() {
		var u UnidadItem
		if err := rows.Scan(&u.ID, &u.Folio, &u.Tipo, &u.Hemocomponente, &u.FechaIngreso, &u.Caducidad, &u.Estado); err != nil {
			continue
		}
		lista = append(lista, u)
	}

	if lista == nil {
		lista = []UnidadItem{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(lista)
}

func RegistrarUnidad(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		GetUnidades(w, r)
		return
	}
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

	// 2. Obtener el ID del tipo de hemocomponente dinámicamente por la columna componente
	var tipoHemocomponenteID int
	err = database.DB.QueryRow(`
		SELECT id FROM tipos_hemocomponente 
		WHERE componente ILIKE '%' || $1 || '%' OR $1 ILIKE '%' || componente || '%' 
		LIMIT 1
	`, input.Hemocomponente).Scan(&tipoHemocomponenteID)
	if err != nil {
		tipoHemocomponenteID = 1 
	}

	// 3. Obtener el ID del estado: Si la fecha de caducidad ya pasó, asignar "Caducado" automáticamente
	estadoNombre := input.Estado
	if input.FechaCaducidad != "" {
		if tCad, parseErr := time.Parse("2006-01-02", input.FechaCaducidad); parseErr == nil {
			hoy := time.Now().Truncate(24 * time.Hour)
			if tCad.Before(hoy) {
				estadoNombre = "Caducado"
			}
		}
	}
	if estadoNombre == "" {
		estadoNombre = "Disponible"
	}

	var estadoID int
	err = database.DB.QueryRow(`
		SELECT id FROM estados_hemocomponente WHERE nombre ILIKE $1 LIMIT 1
	`, estadoNombre).Scan(&estadoID)
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