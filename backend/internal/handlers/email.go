package handlers

import (
	"donavida-backend/internal/email"
	"encoding/json"
	"net/http"
	"strings"
)

// TestEmail atiende POST /api/admin/test-email { "email": "..." }.
// Solo admin general (rol_id 1, mismo patrón que GetAdminResumen).
// Envía el correo de prueba de forma SÍNCRONA para que la respuesta
// confirme si Resend está configurado:
//   - 200 {ok:true, message} si Resend aceptó el envío.
//   - 400 si el email viene vacío o inválido.
//   - 500 con el mensaje de error de Resend, o "RESEND_API_KEY no
//     configurada en el .env del servidor" si falta la clave.
//
// Sin botón en la UI por ahora: la prueba se hace por curl.
func TestEmail(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}
	if !requireAdminGeneral(w, r) {
		return
	}

	var input struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Error al leer los datos", http.StatusBadRequest)
		return
	}
	destino := strings.TrimSpace(input.Email)
	if destino == "" || !strings.Contains(destino, "@") {
		http.Error(w, "Correo inválido: se requiere un email válido", http.StatusBadRequest)
		return
	}

	if err := email.SendPrueba(destino); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"ok":      true,
		"message": "Correo de prueba enviado a " + destino,
	})
}
