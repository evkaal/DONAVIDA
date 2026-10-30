package main

import (
	"donavida-backend/internal/database"
	"donavida-backend/internal/handlers"
	"fmt"
	"net/http"

	
)

func main (){
	database.InitDB()

    
	fmt.Println("Servidor corriendo en el puerto 8080")
    // Rutas de autenticación
    http.HandleFunc("/api/register", handlers.Register) // Asegúrate de que la función en auth.go se llame Register
    http.HandleFunc("/api/login", handlers.Login)       // Y Login
	//ruta de prueba
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request){
    w.Write([]byte("Bienvenido al back"))
	})

	http.ListenAndServe(":8080", nil)
}

