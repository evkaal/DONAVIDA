package main

import (
	"fmt"
	"net/http"

	"donavida-backend/internal/database"
	"donavida-backend/internal/handlers"
)

func main() {
	// Inicializar la base de datos
	database.InitDB()

	// Definir las rutas de autenticación
	http.HandleFunc("/api/register", handlers.Registrar)
	http.HandleFunc("/api/login", handlers.Login)

	fmt.Println("Servidor corriendo en el puerto 8080 con rutas de autenticación...")
	http.ListenAndServe(":8080", nil)
}