-- Revierte 000002_add_creado_por_to_usuarios.
-- Aplicar en la VPS con:
--   sudo -u postgres psql -d donavida -f 000002_add_creado_por_to_usuarios.down.sql

DROP INDEX IF EXISTS idx_usuarios_creado_por;

ALTER TABLE usuarios DROP COLUMN IF EXISTS creado_por;
