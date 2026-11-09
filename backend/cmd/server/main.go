package main

import (
	"donavida-backend/internal/database"
	"donavida-backend/internal/handlers"
	"fmt"
	"log"
	"net/http"
)

// Middleware para habilitar CORS y permitir peticiones desde React (Vite)
func enableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		// Si es una petición preflight del navegador (OPTIONS), responde inmediatamente
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func main() {
	database.InitDB()

	// Creamos un nuevo multiplexor de rutas
	mux := http.NewServeMux()

	// Rutas de autenticación
	mux.HandleFunc("/api/register", handlers.Register)
	mux.HandleFunc("/api/login", handlers.Login)

	//Dashboard
	mux.HandleFunc("/api/dashboard/stats", handlers.GetDashboardStats)
	mux.HandleFunc("/api/dashboard/stock-tipos", handlers.GetStockPorTipo)
	mux.HandleFunc("/api/solicitudes/recientes", handlers.GetSolicitudesRecientes)

	//Registo de unidades
	mux.HandleFunc("/api/unidades", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			handlers.ListarUnidades(w, r)
		case http.MethodPost:
			handlers.RegistrarUnidad(w, r)
		default:
			http.Error(w, "método no permitido", http.StatusMethodNotAllowed)
		}
	})
	//http.HandleFunc("/api/register", handlers.HabilitarCORS(handlers.Register))
	//http.HandleFunc("/api/login", handlers.HabilitarCORS(handlers.Login))

	// Ruta de prueba
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// Manejar 404 si no es la ruta exactísima '/'
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		w.Write([]byte("Bienvenido al back"))
	})

	fmt.Println("Servidor corriendo en el puerto 8080")
	log.Fatal(http.ListenAndServe(":8080", enableCORS(mux)))
	// Pasamos el enrutador (mux) a través de nuestro middleware de CORS y lo levantamos
}
