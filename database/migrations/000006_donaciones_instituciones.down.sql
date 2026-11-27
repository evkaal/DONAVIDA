-- Revierte la migración 000006 (donaciones de la app móvil, datos del
-- mapa y avisos móviles).
--
-- OJO: borra la tabla `donaciones` con TODOS sus datos, quita las
-- columnas de horario/sitio web de `instituciones` y la columna
-- `usuario_movil_id` de `notificaciones` (primero se borran los avisos
-- dirigidos a usuarios móviles, si los hay).
--   sudo -u postgres psql -d donavida -f 000006_donaciones_instituciones.down.sql

DROP TABLE IF EXISTS donaciones;

ALTER TABLE instituciones DROP COLUMN IF EXISTS horario_apertura;
ALTER TABLE instituciones DROP COLUMN IF EXISTS horario_cierre;
ALTER TABLE instituciones DROP COLUMN IF EXISTS sitio_web;
ALTER TABLE instituciones DROP COLUMN IF EXISTS es_publica;

DELETE FROM notificaciones WHERE usuario_movil_id IS NOT NULL;
DROP INDEX IF EXISTS uq_notificaciones_alerta_movil;
ALTER TABLE notificaciones DROP COLUMN IF EXISTS usuario_movil_id;
ALTER TABLE notificaciones ALTER COLUMN usuario_id SET NOT NULL;
