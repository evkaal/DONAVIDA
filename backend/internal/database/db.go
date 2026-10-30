package database

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

//variable global DB que guarda un puntero a un tipo de sql.DB

var DB *sql.DB


func InitDB(){
	//cadena de conexion a la base de datos
	// (usuario postgres, contraseña, puerto)
	conStr := "host=localhost port=5432 user=postgres password=felix123 dbname=donavida sslmode=disable"
    

	
    var err error
	DB, err = sql.Open("postgres", conStr)
	if err != nil {
		log.Fatalf("Error con la conexión a la BD: %v", err)
	}

	//comprobar que la conexión a la BD sea exitosa
	err = DB.Ping()
	if err != nil{
		log.Fatalf("No se pudo conectar a la BD: %v", err)
	}


	fmt.Println("La conexión a la BD fue todo un exito")


}