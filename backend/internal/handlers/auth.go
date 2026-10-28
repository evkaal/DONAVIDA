package handlers

import(
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"donavida-backend/internal/database"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"os"
	"log"


)


//clave para los tokens JWT(con variables de entorno)
var jwtKey= []byte(getJWTSecret())


func getJWTSecret() string{
	secret := os.Getenv("JWT_SECRET")
	if secret ==  ""{
		//si no se encuentra la variable, el servidor se detiene
		log.Fatal("Fatal: la variable de entorno JWT_Secret no esta definida")
	}
	return secret
}


type claims struct {
	Email string `json:"email"`
	RolID int `json:"rol_id`
	jwt.RegisteredClaims
}

type usuarioInput struct{
	Nombre string `json: "nombre"`
	Email string `json:"email"`
	Password string `json:"password"` 
	RolID int `json:"rol_id"`
	InstitucionId *int `json:"institucion_id"`
}

//primer endpoint
func Registrar(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}

	var input usuarioInput
	err := json.NewDecoder(r.Body).Decode(&input)
	if err != nil {
		http.Error(w, "Datos inválidos", http.StatusBadRequest)
		return
	}

	// Encriptar la contraseña de forma segura con bcrypt
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Error al procesar la contraseña", http.StatusInternalServerError)
		return
	}

	// Insertar el usuario en la base de datos de PostgreSQL
	query := `INSERT INTO usuarios (nombre, email, password_hash, rol_id, institucion_id) VALUES ($1, $2, $3, $4, $5)`
	_, err = database.DB.Exec(query, input.Nombre, input.Email, string(hashedPassword), input.RolID, input.InstitucionId)
	if err != nil {
		http.Error(w, "Error al registrar el usuario (el email podría estar duplicado)", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"mensaje": "Usuario registrado exitosamente"})
}

// 2. Endpoint de Login y Generación de JWT
func Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}

	var input usuarioInput
	err := json.NewDecoder(r.Body).Decode(&input)
	if err != nil {
		http.Error(w, "Datos inválidos", http.StatusBadRequest)
		return
	}

	var id int
	var passwordHash string
	var rolID int

	// Buscar al usuario por su email en la base de datos
	query := `SELECT id, password_hash, rol_id FROM usuarios WHERE email = $1`
	err = database.DB.QueryRow(query, input.Email).Scan(&id, &passwordHash, &rolID)
	if err == sql.ErrNoRows {
		http.Error(w, "Credenciales inválidas (usuario no encontrado)", http.StatusUnauthorized)
		return
	} else if err != nil {
		http.Error(w, "Error en el servidor", http.StatusInternalServerError)
		return
	}

	// Comparar la contraseña ingresada con el hash guardado
	err = bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(input.Password))
	if err != nil {
		http.Error(w, "Credenciales inválidas (contraseña incorrecta)", http.StatusUnauthorized)
		return
	}

	// Generar el Token JWT (válido por 24 horas)
	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &claims{
		Email: input.Email,
		RolID: rolID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtKey)
	if err != nil {
		http.Error(w, "Error al generar el token", http.StatusInternalServerError)
		return
	}

	// Devolver el token como respuesta para Postman
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"token":   tokenString,
		"mensaje": "Login exitoso",
	})
}



