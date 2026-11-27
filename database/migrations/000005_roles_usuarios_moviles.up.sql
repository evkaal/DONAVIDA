-- Migración 000005: roles de la app móvil + tabla usuarios_moviles.
--
-- Contexto: la misma base `donavida` sirve al sistema web y a la app móvil.
-- La app registra donantes con nombre, correo, tipo de sangre y contraseña,
-- y la tabla principal `usuarios` no tiene tipo de sangre (además pide
-- institucion_id, que un donante móvil no tiene). Por eso los usuarios de
-- la app viven en su propia tabla `usuarios_moviles`.
--
-- Qué agrega:
--   1) Dos roles en `roles`: 'admin_movil' (para el equipo) y
--      'usuario_movil' (donante de la app). Idempotente: si se corre dos
--      veces no duplica (ON CONFLICT DO NOTHING). 'admin_movil' ya venía
--      en la migración 000004, así que si esa ya se aplicó, solo se agrega
--      'usuario_movil'.
--   2) Tabla `usuarios_moviles` con los campos que pide el registro móvil
--      (nombre, correo, tipo_sangre, contraseña) más los del perfil de la
--      app (fecha_nacimiento, sexo, telefono, colonia). La contraseña se
--      guarda como hash BCrypt en `password_hash`, igual que en `usuarios`:
--      NUNCA se guarda la contraseña en claro.
--   3) `tipo_sangre` se guarda como texto ('O+', 'A-', ...) tal como lo
--      manda la app, con CHECK a los 8 valores válidos.
--
-- Cómo aplicar (en la VPS, después de hacer git pull con este archivo en
-- database/migrations/):
--   sudo -u postgres psql -d donavida -f database/migrations/000005_roles_usuarios_moviles.up.sql
--
-- PENDIENTE (trabajo aparte, no lo hace este archivo): el backend que se
-- entregó para la app (migración 000004 + endpoints) usa `usuarios` +
-- `donantes` con el rol 'donante'. Para que el registro/login de la app
-- usen esta tabla nueva, hay que actualizar esos endpoints a
-- `usuarios_moviles` + rol 'usuario_movil'.
--
-- 1) Roles de la app móvil (idempotente).
INSERT INTO roles (nombre, descripcion) VALUES
  ('admin_movil', 'Administrador de la app móvil DONAVIDA.'),
  ('usuario_movil', 'Usuario de la app móvil DONAVIDA (donante): consulta bancos de sangre, registra sus donaciones y recibe avisos.')
ON CONFLICT (nombre) DO NOTHING;

-- 2) Usuarios de la app móvil (donantes).
CREATE TABLE IF NOT EXISTS usuarios_moviles (
  id serial PRIMARY KEY,
  nombre varchar(100) NOT NULL,
  correo varchar(150) UNIQUE NOT NULL,
  password_hash varchar(255) NOT NULL,
  tipo_sangre varchar(5) NOT NULL CHECK (tipo_sangre IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  fecha_nacimiento date,
  sexo varchar(10),
  telefono varchar(20),
  colonia varchar(100),
  rol_id int REFERENCES roles(id),
  estado boolean DEFAULT true,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usuarios_moviles_correo ON usuarios_moviles (correo);

-- Verificación: deben aparecer los 2 roles y la tabla vacía (0 filas).
SELECT id, nombre FROM roles WHERE nombre IN ('admin_movil', 'usuario_movil') ORDER BY nombre;
SELECT COUNT(*) AS usuarios_moviles FROM usuarios_moviles;
