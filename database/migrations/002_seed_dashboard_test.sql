-- ============================================
-- PRUEBAS Y DATOS INICIALES (SEED) - DONAVIDA
-- ============================================

-- 1. Catálogos base e institución
INSERT INTO roles (id, nombre, descripcion) 
VALUES (3, 'Médico', 'Rol de pruebas') 
ON CONFLICT (id) DO NOTHING;

INSERT INTO usuarios (id, nombre, email, password_hash, rol_id, institucion_id) 
VALUES (1, 'Dr. Juan Pérez', 'juanito@gmail.com', '$2a$10$X...hash_de_ejemplo...', 3, null) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO tipos_sangre (id, grupo_abo, factor_rh) 
VALUES (1, 'O', '+') 
ON CONFLICT (grupo_abo, factor_rh) DO NOTHING;

INSERT INTO tipos_hemocomponente (id, componente, volumen_ml, dias_vigencia) 
VALUES (1, 'Paquete globular', 450, 42) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO estados_hemocomponente (id, nombre) 
VALUES (1, 'Disponible') 
ON CONFLICT (id) DO NOTHING;

INSERT INTO tipos_institucion (id, nombre) 
VALUES (1, 'Hospital Público') 
ON CONFLICT (id) DO NOTHING;

INSERT INTO colonias (id, nombre, codigo_postal) 
VALUES (1, 'Centro', '68000') 
ON CONFLICT (id) DO NOTHING;

INSERT INTO instituciones (id, nombre, tipo_institucion_id, colonia_id) 
VALUES (1, 'Hospital General de Oaxaca', 1, 1) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO niveles_prioridad (id, nombre, orden) 
VALUES (1, 'Urgente', 1) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO estados_solicitud (id, nombre) 
VALUES (1, 'Pendiente') 
ON CONFLICT (id) DO NOTHING;

-- 2. Hemocomponentes de prueba
INSERT INTO hemocomponentes (codigo_unidad, tipo_sangre_id, tipo_hemocomponente_id, estado_id, institucion_id, fecha_extraccion, fecha_caducidad)
VALUES ('FOLIO-TEST-001', 1, 1, 1, 1, CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '20 days')
ON CONFLICT (codigo_unidad) DO NOTHING;

INSERT INTO hemocomponentes (codigo_unidad, tipo_sangre_id, tipo_hemocomponente_id, estado_id, institucion_id, fecha_extraccion, fecha_caducidad)
VALUES ('FOLIO-TEST-002', 1, 1, 1, 1, CURRENT_DATE - INTERVAL '35 days', CURRENT_DATE + INTERVAL '3 days')
ON CONFLICT (codigo_unidad) DO NOTHING;

-- 3. Solicitud de Emergencia Pendiente
INSERT INTO solicitudes_emergencia (institucion_solicitante_id, usuario_solicitante_id, prioridad_id, estado_id, motivo)
VALUES (1, 1, 1, 1, 'Paciente crítico requiriendo transfusión urgente de prueba');

-- 4. Umbral de Stock Crítico
INSERT INTO umbrales_stock (institucion_id, tipo_sangre_id, tipo_hemocomponente_id, stock_minimo)
VALUES (1, 1, 1, 5)
ON CONFLICT (institucion_id, tipo_sangre_id, tipo_hemocomponente_id) 
DO UPDATE SET stock_minimo = 5;