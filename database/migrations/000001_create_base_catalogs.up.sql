CREATE TABLE roles (
  id serial PRIMARY KEY,
  nombre varchar(50) UNIQUE NOT NULL,
  descripcion text
);

CREATE TABLE tipos_institucion (
  id serial PRIMARY KEY,
  nombre varchar(50) UNIQUE NOT NULL,
  descripcion text
);

CREATE TABLE colonias (
  id serial PRIMARY KEY,
  nombre varchar(100) NOT NULL,
  codigo_postal varchar(5) NOT NULL,
  UNIQUE (nombre, codigo_postal)
);

CREATE TABLE tipos_sangre (
  id serial PRIMARY KEY,
  grupo_abo varchar(2) NOT NULL,
  factor_rh varchar(1) NOT NULL,
  UNIQUE (grupo_abo, factor_rh)
);

CREATE TABLE tipos_hemocomponente (
  id serial PRIMARY KEY,
  componente varchar(50) UNIQUE NOT NULL,
  volumen_ml int,
  dias_vigencia int
);

CREATE TABLE estados_hemocomponente (
  id serial PRIMARY KEY,
  nombre varchar(30) UNIQUE NOT NULL
);

CREATE TABLE niveles_prioridad (
  id serial PRIMARY KEY,
  nombre varchar(30) UNIQUE NOT NULL,
  orden int
);

CREATE TABLE estados_solicitud (
  id serial PRIMARY KEY,
  nombre varchar(30) UNIQUE NOT NULL
);

CREATE TABLE estados_asignacion (
  id serial PRIMARY KEY,
  nombre varchar(30) UNIQUE NOT NULL
);

CREATE TABLE tipos_alerta (
  id serial PRIMARY KEY,
  nombre varchar(50) UNIQUE NOT NULL,
  descripcion text
);

CREATE TABLE acciones_auditoria (
  id serial PRIMARY KEY,
  nombre varchar(100) UNIQUE NOT NULL
);