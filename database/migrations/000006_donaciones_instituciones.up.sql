-- Migración 000006: donaciones de la app móvil + datos del mapa + avisos móviles.
--
-- Qué agrega:
--   1) Tabla `donaciones`: cada donación que el usuario móvil registra
--      desde la app (en qué institución, qué fecha, de qué tipo, con qué
--      comprobante). NO descuenta stock: es el historial del donante.
--      La referencia es `usuario_movil_id` a `usuarios_moviles(id)`
--      (migración 000005). NO hay tabla de donantes separada: la
--      migración 000004, que la creaba, NUNCA se aplicó y NO debe
--      aplicarse.
--   2) Columnas nuevas en `instituciones` para el mapa de la app:
--      horario de apertura/cierre, sitio web (botón "Sacar cita") y si
--      es pública.
--   3) Avisos para usuarios móviles en `notificaciones`: la tabla exigía
--      `usuario_id` NOT NULL a `usuarios(id)`, así que un usuario móvil
--      no cabía. Ahora `usuario_id` pasa a nullable y se agrega
--      `usuario_movil_id` (nullable, a `usuarios_moviles(id)`): cada
--      fila tiene UNO de los dos. La unicidad se mantiene con el índice
--      parcial de abajo (el UNIQUE viejo no cubre los NULL).
--
-- IMPORTANTE: el backend NO corre migraciones al arrancar, así que hay que
-- aplicar este archivo a mano en la VPS ANTES de reiniciar el backend con
-- el código nuevo (si no, los endpoints móviles fallan porque la tabla
-- `donaciones` y las columnas no existen). La 000005 ya está en el repo
-- (commit e54b860) y debe estar aplicada ANTES que esta (la tabla
-- `usuarios_moviles` y los roles 'admin_movil'/'usuario_movil' ya
-- deben existir):
--   sudo -u postgres psql -d donavida -f database/migrations/000006_donaciones_instituciones.up.sql
--
-- 1) Donaciones registradas por el usuario móvil desde la app.
CREATE TABLE IF NOT EXISTS donaciones (
  id serial PRIMARY KEY,
  usuario_movil_id int NOT NULL REFERENCES usuarios_moviles(id),
  institucion_id int NOT NULL REFERENCES instituciones(id),
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  tipo_sangre_id int NOT NULL REFERENCES tipos_sangre(id),
  tipo_hemocomponente_id int NOT NULL REFERENCES tipos_hemocomponente(id),
  comprobante varchar(255),
  created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_donaciones_usuario_movil ON donaciones (usuario_movil_id);
CREATE INDEX IF NOT EXISTS idx_donaciones_fecha ON donaciones (usuario_movil_id, fecha DESC);

-- 2) Instituciones: datos que muestra el mapa de la app.
ALTER TABLE instituciones ADD COLUMN IF NOT EXISTS horario_apertura time;
ALTER TABLE instituciones ADD COLUMN IF NOT EXISTS horario_cierre time;
ALTER TABLE instituciones ADD COLUMN IF NOT EXISTS sitio_web varchar(200);
ALTER TABLE instituciones ADD COLUMN IF NOT EXISTS es_publica boolean DEFAULT true;

-- 3) Avisos para usuarios móviles (ver punto 3 del encabezado).
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS usuario_movil_id int REFERENCES usuarios_moviles(id);
ALTER TABLE notificaciones ALTER COLUMN usuario_id DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_notificaciones_alerta_movil
  ON notificaciones (alerta_id, usuario_movil_id) WHERE usuario_movil_id IS NOT NULL;

-- Comprobación final: tabla creada, columnas en instituciones y en
-- notificaciones, índices creados.
SELECT COUNT(*) AS donaciones FROM donaciones;
SELECT column_name FROM information_schema.columns
  WHERE table_name IN ('instituciones', 'notificaciones')
  AND column_name IN ('horario_apertura', 'horario_cierre', 'sitio_web', 'es_publica', 'usuario_movil_id')
  ORDER BY table_name, column_name;
