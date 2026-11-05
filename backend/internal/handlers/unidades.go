package handlers

import (
	//"database/sql"
	"encoding/json"
	"net/http"
	"donavida-backend/internal/database" // Ajustado al nombre real de tu módulo definido en el go.mod
)

type UnidadInput struct {
	CodigoUnidad         string `json:"codigo_unidad"`
	TipoSangreID         int    `json:"tipo_sangre_id"`
	TipoHemocomponenteID int    `json:"tipo_hemocomponente_id"`
	EstadoID             int    `json:"estado_id"`
	InstitucionID        int    `json:"institucion_id"`
	FechaExtraccion      string `json:"fecha_extraccion"`
	FechaCaducidad       string `json:"fecha_caducidad"`
}

func RegistrarUnidad(w http.ResponseWriter, r *http.Request) {
	// Asegurar cabeceras CORS y método POST
	w.Header().Set("Content-Type", "application/json")
	if r.Method != http.MethodPost {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}

	var input UnidadInput
	err := json.NewDecoder(r.Body).Decode(&input)
	if err != nil {
		http.Error(w, "Error al decodificar los datos", http.StatusBadRequest)
		return
	}

	// Query de inserción a la base de datos PostgreSQL
	query := `
		INSERT INTO hemocomponentes (codigo_unidad, tipo_sangre_id, tipo_hemocomponente_id, estado_id, institucion_id, fecha_extraccion, fecha_caducidad)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`

	var nuevoID int
	err = database.DB.QueryRow(
		query,
		input.CodigoUnidad,
		input.TipoSangreID,
		input.TipoHemocomponenteID,
		input.EstadoID,
		input.InstitucionID,
		input.FechaExtraccion,
		input.FechaCaducidad,
	).Scan(&nuevoID)

	if err != nil {
		http.Error(w, "Error al guardar en la base de datos: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"mensaje": "Unidad registrada con éxito",
		"id":      nuevoID,
	})
}