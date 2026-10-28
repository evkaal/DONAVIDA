package main

import (
	"donavida-backend/internal/database"
	"fmt"
	"net/http"

	
)

func main (){
	database.InitDB()


	fmt.Println("Servidor corriendo en el puerto 8080")

	//ruta de prueba
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request){
    w.Write([]byte("Bienvenido al back"))
	})

	http.ListenAndServe(":8080", nil)
}