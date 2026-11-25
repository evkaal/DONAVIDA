package main

import (
	"donavida-backend/internal/database"
	"donavida-backend/internal/handlers"
	"fmt"
	"net/http"
	"os"
	"strings"
)

// Orígenes permitidos para CORS.
// Se pueden definir en ALLOWED_ORIGINS separados por coma, por ejemplo:
// ALLOWED_ORIGINS=http://localhost:5173,http://159.173.138.239,https://tu-dominio.com
// Si no se define, se usan estos valores por defecto.
func allowedOrigins() map[string]bool {
	origins := map[string]bool{
		"http://localhost:5173":      true,
		"http://127.0.0.1:5173":      true,
		"http://159.173.138.239":     true,
		"http://159.173.138.239:5173": true,
		"http://159.173.138.239:8080": true,
	}
	if v := os.Getenv("ALLOWED_ORIGINS"); v != "" {
		for _, o := range strings.Split(v, ",") {
			o = strings.TrimSpace(o)
			if o != "" {
				origins[o] = true
			}
		}
	}
	return origins
}

// Middleware para habilitar CORS y permitir peticiones desde React (Vite)
// tanto en local como en producción (VPS / dominio).
func enableCORS(next http.Handler) http.Handler {
	allowed := allowedOrigins()
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if allowed[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
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
	// y para darlos de baja o reactivarlos
	// (PATCH /api/usuarios/{id}/estado  { "estado": true|false })
	mux.HandleFunc("/api/usuarios/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			handlers.EliminarUsuario(w, r)
		} else if r.Method == http.MethodPatch && strings.HasSuffix(r.URL.Path, "/estado") {
			handlers.CambiarEstadoUsuario(w, r)
		} else {
			http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		}
	})

	// Rutas de dashboard y stock
	mux.HandleFunc("/api/admin/resumen", handlers.GetAdminResumen)
	// Prueba de correo con Resend (solo admin general): POST /api/admin/test-email
	mux.HandleFunc("/api/admin/test-email", handlers.TestEmail)
	mux.HandleFunc("/api/dashboard/stats", handlers.GetDashboardStats)
	mux.HandleFunc("/api/dashboard/stock-tipos", handlers.GetStockPorTipo)
	mux.HandleFunc("/api/dashboard/actividad", handlers.GetActividadReciente)
	mux.HandleFunc("/api/solicitudes/recientes", handlers.GetSolicitudesRecientes)
	mux.HandleFunc("/api/stock", handlers.GetStock)

	// Unidades: GET lista, POST registra
	mux.HandleFunc("/api/unidades", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			handlers.GetUnidades(w, r)
		case http.MethodPost:
			handlers.RegistrarUnidad(w, r)
		default:
			http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		}
	})

	// Salida de unidad: POST /api/unidades/{id}/salida
	mux.HandleFunc("/api/unidades/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/salida") {
			handlers.RegistrarSalida(w, r)
			return
		}
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
	})

	// Solicitudes: POST crea, GET /historico lista el histórico
	mux.HandleFunc("/api/solicitudes", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			handlers.CrearSolicitud(w, r)
		} else {
			http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		}
	})
	mux.HandleFunc("/api/solicitudes/historico", handlers.GetHistorico)

	// Solicitudes entrantes: GET lista, POST /{id}/aceptar|/rechazar responde
	mux.HandleFunc("/api/solicitudes/entrantes", handlers.GetSolicitudesEntrantes)
	mux.HandleFunc("/api/solicitudes/entrantes/", handlers.ResponderSolicitud)

	// Notificaciones: GET lista del usuario, PATCH /{id}/leida marca leída
	mux.HandleFunc("/api/notificaciones", handlers.GetNotificaciones)
	mux.HandleFunc("/api/notificaciones/", handlers.MarcarNotificacionLeida)

	// Catálogos simples para formularios
	mux.HandleFunc("/api/catalogos/tipos-institucion", handlers.GetTiposInstitucion)
	mux.HandleFunc("/api/catalogos/colonias", handlers.GetColonias)
	mux.HandleFunc("/api/catalogos/tipos-sangre", handlers.GetTiposSangre)
	mux.HandleFunc("/api/catalogos/hemocomponentes", handlers.GetHemocomponentes)
	mux.HandleFunc("/api/catalogos/roles", handlers.GetRoles)

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
		case http.MethodDelete:
			handlers.EliminarInstitucion(w, r)
		default:
			http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		}
	})

	// Ruta de prueba
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Bienvenido al back"))
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	fmt.Println("Servidor corriendo en el puerto " + port)

	// Pasamos el enrutador (mux) a través de nuestro middleware de CORS y lo levantamos
	if err := http.ListenAndServe(":"+port, enableCORS(mux)); err != nil {
		fmt.Println("Error al iniciar el servidor:", err)
		os.Exit(1)
	}
}
