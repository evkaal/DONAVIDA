CREATE INDEX IF NOT EXISTS idx_hemo_estado_caducidad
  ON hemocomponentes (estado_id, fecha_caducidad);

CREATE INDEX IF NOT EXISTS idx_hemo_stock
  ON hemocomponentes (institucion_id, tipo_sangre_id, tipo_hemocomponente_id, estado_id);

CREATE INDEX IF NOT EXISTS idx_solicitudes_estado_fecha
  ON solicitudes_emergencia (estado_id, fecha_solicitud DESC);