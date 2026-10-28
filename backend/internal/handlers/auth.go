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
	Password  int `json:"password"` 
	RolID  int `json:"rol_id"`
	InstitucionId *int `json:"institucion_id"`
}




