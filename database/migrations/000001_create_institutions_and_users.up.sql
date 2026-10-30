CREATE TABLE instituciones (
  id serial PRIMARY KEY,
  nombre varchar(150) NOT NULL,
  tipo_institucion_id int NOT NULL REFERENCES tipos_institucion(id),
  colonia_id int NOT NULL REFERENCES colonias(id),
  calle_numero varchar(200),
  latitud decimal(9,6),
  longitud decimal(9,6),
  telefono varchar(20),
  activo boolean DEFAULT true
);

CREATE TABLE usuarios (
  id serial PRIMARY KEY,
  nombre varchar(100) NOT NULL,
  email varchar(100) UNIQUE NOT NULL,
  password_hash varchar(255) NOT NULL,
  rol_id int NOT NULL REFERENCES roles(id),
  institucion_id int REFERENCES instituciones(id),
  estado boolean DEFAULT true,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP
);