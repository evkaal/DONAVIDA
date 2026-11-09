package handlers

import (
	//"database/sql"
	"donavida-backend/internal/database" // Ajustado al nombre real de tu módulo definido en el go.mod
	"encoding/json"
	"log"
	"net/http"
)

type UnidadInput struct {
	Codigo          string `json:"codigo"`
	TipoSangre      string `json:"tipoSangre"`
	Hemocomponente  string `json:"hemocomponente"`
	FechaExtraccion string `json:"fechaExtraccion"`
	FechaCaducidad  string `json:"fechaCaducidad"`
	Estado          string `json:"estado"`
	InstitucionID   int    `json:"institucion_id"`
}

func RegistrarUnidad(w http.ResponseWriter, r *http.Request) {
	// Asegurar cabeceras CORS y método POST
	w.Header().Set("Content-Type", "application/json")
	if r.Method != http.MethodPost {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}

	var in UnidadInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "Error al decodificar los datos", http.StatusBadRequest)
		return
	}

	if len(in.TipoSangre) < 2 {
		http.Error(w, "Tipo sanguíneo inválido", http.StatusBadRequest)
		return
	}
	if in.Estado == "" {
		in.Estado = "Disponible"
	}
	if in.InstitucionID == 0 {
		in.InstitucionID = 1
	}

	grupo := in.TipoSangre[:len(in.TipoSangre)-1]
	factor := in.TipoSangre[len(in.TipoSangre)-1:]

	var tipoSangreID, hemoID, estadoID int
	if err := database.DB.QueryRow(
		`SELECT id FROM tipos_sangre WHERE grupo_abo = $1 AND factor_rh = $2`, grupo, factor,
	).Scan(&tipoSangreID); err != nil {
		http.Error(w, "Tipo sanguíneo no existe en la base: "+in.TipoSangre, http.StatusBadRequest)
		return
	}
	if err := database.DB.QueryRow(
		`SELECT id FROM tipos_hemocomponente WHERE componente ILIKE $1`, in.Hemocomponente,
	).Scan(&hemoID); err != nil {
		http.Error(w, "Hemocomponente no existe en la base: "+in.Hemocomponente, http.StatusBadRequest)
		return
	}
	if err := database.DB.QueryRow(
		`SELECT id FROM estados_hemocomponente WHERE nombre ILIKE $1`, in.Estado,
	).Scan(&estadoID); err != nil {
		http.Error(w, "Estado no existe en la base: "+in.Estado, http.StatusBadRequest)
		return
	}

	// Query de inserción a la base de datos PostgreSQL

	var nuevoID int
	err := database.DB.QueryRow(`
		INSERT INTO hemocomponentes
		(codigo_unidad, tipo_sangre_id, tipo_hemocomponente_id, estado_id, institucion_id, fecha_extraccion, fecha_caducidad)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id`,
		in.Codigo, tipoSangreID, hemoID, estadoID, in.InstitucionID, in.FechaExtraccion, in.FechaCaducidad,
	).Scan(&nuevoID)
	if err != nil {
		log.Printf("Error al insertar unidad: %v", err)
		http.Error(w, "Error al registrar la unidad: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"mensaje": "Unidad registrada con éxito",
		"id":      nuevoID,
	})
}
