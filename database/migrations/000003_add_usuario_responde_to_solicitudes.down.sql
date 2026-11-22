DROP INDEX IF EXISTS idx_solicitudes_usuario_responde;

ALTER TABLE solicitudes_emergencia DROP COLUMN IF EXISTS usuario_responde_id;
