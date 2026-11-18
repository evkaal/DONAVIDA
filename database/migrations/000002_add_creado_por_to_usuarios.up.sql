-- Añade el creador de cada usuario (quién lo registró).
-- Sin esta columna no se puede limitar a un admin_institucion a ver solo
-- los usuarios que él creó (GET /api/usuarios filtra por creado_por).
--
-- IMPORTANTE: el backend NO corre migraciones al arrancar, así que hay que
-- aplicar este archivo a mano en la VPS ANTES de reiniciar el backend con
-- el código nuevo (si no, INSERT/SELECT de usuarios fallan porque la
-- columna no existe):
--   sudo -u postgres psql -d donavida -f 000002_add_creado_por_to_usuarios.up.sql
-- Los usuarios creados antes de esta migración quedan con creado_por NULL:
-- solo el admin_general los ve; ningún admin_institucion los hereda.

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS creado_por INT REFERENCES usuarios(id);

CREATE INDEX IF NOT EXISTS idx_usuarios_creado_por ON usuarios (creado_por);
