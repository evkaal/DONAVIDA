package handlers

import(
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"donavida-backend/internal/database"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"


)


//clave para los tokens JWT(con variables de entorno)
var jwtKey= []byte("NA_IN_GE_65dfnov")


type claims struct {
	Email string `json:"email"`
	RolID int `json:"rol_id`
	jwt.RegisteredClaims
}

type usuarioInput struct{
	Nombre string `json: "nombre"`
	Email string `json:"email"`
	Password  int `json:"password"` 
	RolID  int `json:"rol_id"`
	InstitucionId *int `json:"institucion_id"`
}




