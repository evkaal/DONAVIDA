package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
)

//variable global DB que guarda un puntero a un tipo de sql.DB

var DB *sql.DB

func InitDB() {
	//cadena de conexion a la base de datos
	// (usuario postgres, contraseña, puerto)
	password := os.Getenv("DB_PASSWORD")
	if password == "" {
		password = "donages" // la que usa la rama de integración
	}

	conStr := fmt.Sprintf(
		"host=localhost port=5432 user=postgres password=%s dbname=donavida sslmode=disable",
		password,
	)

	var err error
	DB, err = sql.Open("postgres", conStr)
	if err != nil {
		log.Fatalf("Error con la conexión a la BD: %v", err)
	}

	//comprobar que la conexión a la BD sea exitosa

	if err = DB.Ping(); err != nil {
		log.Fatalf("No se pudo conectar a la BD: %v", err)
	}

	fmt.Println("La conexión a la BD fue todo un exito")
}
