package handlers

import (
	
	"encoding/json"
	"net/http"
	"os"
	"log"
    "fmt"
	"donavida-backend/internal/database"

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
	Password      string `json:"password"` // <--- Corregido a string para recibir la contraseña en texto
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

	// 1. Buscar el usuario en la base de datos por su email
	var storedHash string
	var nombreUsuario string
	var rolID int
	
	query := `SELECT nombre, password_hash, rol_id FROM usuarios WHERE email = $1`
	err = database.DB.QueryRow(query, input.Email).Scan(&nombreUsuario, &storedHash, &rolID)
	
	if err != nil {
		// Si no existe el correo o hay un error, denegamos el acceso (401 Unauthorized)
		http.Error(w, "Correo o contraseña incorrectos", http.StatusUnauthorized)
		return
	}
	fmt.Printf("Intentando login para: %s con contraseña ingresada: %s\n", input.Email, input.Password)

	// 2. Comparar la contraseña ingresada en texto plano con el hash de la BD usando bcrypt
	err = bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(input.Password))
	if err != nil {
		// Si la contraseña no coincide, denegamos el acceso
		http.Error(w, "Correo o contraseña incorrectos", http.StatusUnauthorized)
		return
	}

	// 3. Si todo es correcto, respondemos con éxito y los datos del usuario
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"mensaje": "Login exitoso",
		"nombre":  nombreUsuario,
		"email":   input.Email,
		"rol_id":  rolID,
	})
}
