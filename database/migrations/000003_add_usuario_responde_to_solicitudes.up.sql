-- Registra quién atendió cada solicitud de emergencia (qué usuario de qué
-- institución la aceptó), para poder mostrar "Atendida por {institución}"
-- en Solicitudes entrantes y avisar a las demás instituciones.
--
-- IMPORTANTE: el backend NO corre migraciones al arrancar, así que hay que
-- aplicar este archivo a mano en la VPS ANTES de reiniciar el backend con
-- el código nuevo (si no, ResponderSolicitud y GetSolicitudesEntrantes
-- fallan porque la columna no existe):
--   sudo -u postgres psql -d donavida -f 000003_add_usuario_responde_to_solicitudes.up.sql
-- Las solicitudes ya atendidas antes de esta migración quedan con
-- usuario_responde_id NULL (sin "Atendida por").

ALTER TABLE solicitudes_emergencia ADD COLUMN IF NOT EXISTS usuario_responde_id INT REFERENCES usuarios(id);

CREATE INDEX IF NOT EXISTS idx_solicitudes_usuario_responde ON solicitudes_emergencia (usuario_responde_id);
