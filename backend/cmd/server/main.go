package main

import (
	"donavida-backend/internal/database"
	"donavida-backend/internal/handlers"
	"fmt"
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

	// Ruta unificada para usuarios (GET para listar, POST para registrar)
	mux.HandleFunc("/api/usuarios", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			handlers.GetUsuarios(w, r)
		case http.MethodPost:
			handlers.Register(w, r)
		default:
			http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		}
	})

	// Ruta para eliminar usuarios por ID (DELETE /api/usuarios/{id})
	mux.HandleFunc("/api/usuarios/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			handlers.EliminarUsuario(w, r)
		} else {
			http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		}
	})

	// Rutas de dashboard y stock
	mux.HandleFunc("/api/dashboard/stats", handlers.GetDashboardStats)
	mux.HandleFunc("/api/dashboard/stock-tipos", handlers.GetStockPorTipo)
	mux.HandleFunc("/api/solicitudes/recientes", handlers.GetSolicitudesRecientes)
	mux.HandleFunc("/api/unidades", handlers.RegistrarUnidad)

	// Ruta unificada para instituciones (GET para listar, POST para registrar)
	mux.HandleFunc("/api/instituciones", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			handlers.GetInstituciones(w, r)
		case http.MethodPost:
			handlers.RegistrarInstitucion(w, r)
		default:
			http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		}
	})

	mux.HandleFunc("/api/instituciones/", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			handlers.GetInstituciones(w, r)
		case http.MethodPost:
			handlers.RegistrarInstitucion(w, r)
		default:
			http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		}
	})

	// Ruta de prueba
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Bienvenido al back"))
	})

	fmt.Println("Servidor corriendo en el puerto 8080")

	// Pasamos el enrutador (mux) a través de nuestro middleware de CORS y lo levantamos
	http.ListenAndServe(":8080", enableCORS(mux))
}