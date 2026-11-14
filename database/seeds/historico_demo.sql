-- Datos de demostración para la pantalla Histórico.
-- Ejecutar solo en una base local/de desarrollo con el esquema y catálogos cargados.
-- Crea 12 solicitudes para que se puedan probar filtros y paginación.
-- Es idempotente: si ya existen filas con esta marca, no vuelve a insertarlas.

BEGIN;

DO $$
DECLARE
  v_usuario_id integer;
  v_institucion_id integer;
  v_prioridad_id integer;
  v_tipo_sangre_id integer;
  v_componente_id integer;
  v_estados integer[];
  v_estado_id integer;
  v_estado_nombre varchar(30);
  v_solicitud_id integer;
  v_fecha_solicitud timestamp;
  v_hay_usuario boolean := false;
  i integer;
BEGIN
  IF EXISTS (
    SELECT 1 FROM solicitudes_emergencia
    WHERE motivo LIKE 'DEMO_HISTORICO_DONAVIDA:%'
  ) THEN
    RAISE NOTICE 'Los datos demo del histórico ya existen; no se insertaron duplicados.';
  ELSE
    SELECT id INTO v_prioridad_id
    FROM niveles_prioridad
    ORDER BY orden NULLS LAST, id
    LIMIT 1;

    SELECT id INTO v_tipo_sangre_id
    FROM tipos_sangre
    WHERE grupo_abo = 'O' AND factor_rh = '+';

    SELECT id INTO v_componente_id
    FROM tipos_hemocomponente
    ORDER BY id
    LIMIT 1;

    SELECT array_agg(id ORDER BY id) INTO v_estados
    FROM estados_solicitud;

    IF v_prioridad_id IS NULL OR v_tipo_sangre_id IS NULL
       OR v_componente_id IS NULL OR v_estados IS NULL THEN
      RAISE EXCEPTION 'Faltan catálogos de prioridad, tipo de sangre, hemocomponente o estado.';
    END IF;

    FOR v_usuario_id, v_institucion_id IN
      SELECT DISTINCT ON (u.institucion_id) u.id, u.institucion_id
      FROM usuarios u
      WHERE u.estado = true AND u.institucion_id IS NOT NULL
      ORDER BY u.institucion_id, u.id
    LOOP
      v_hay_usuario := true;

      FOR i IN 1..12 LOOP
        SELECT id, nombre INTO v_estado_id, v_estado_nombre
        FROM estados_solicitud
        ORDER BY id
        OFFSET ((i - 1) % cardinality(v_estados))
        LIMIT 1;

        v_fecha_solicitud := CURRENT_TIMESTAMP - ((i - 1) * INTERVAL '1 day');

        INSERT INTO solicitudes_emergencia (
          institucion_solicitante_id,
          usuario_solicitante_id,
          prioridad_id,
          estado_id,
          motivo,
          fecha_solicitud,
          fecha_cierre
        )
        VALUES (
          v_institucion_id,
          v_usuario_id,
          v_prioridad_id,
          v_estado_id,
          'DEMO_HISTORICO_DONAVIDA: Solicitud de prueba ' || i,
          v_fecha_solicitud,
          CASE
            WHEN lower(v_estado_nombre) IN (
              'completada', 'completado', 'rechazada', 'rechazado', 'cancelada', 'cancelado'
            ) THEN v_fecha_solicitud + INTERVAL '1 hour'
            ELSE NULL
          END
        )
        RETURNING id INTO v_solicitud_id;

        INSERT INTO solicitud_detalles (
          solicitud_id,
          tipo_sangre_id,
          tipo_hemocomponente_id,
          cantidad
        )
        VALUES (
          v_solicitud_id,
          v_tipo_sangre_id,
          v_componente_id,
          (i % 4) + 1
        );
      END LOOP;
    END LOOP;

    IF NOT v_hay_usuario THEN
      RAISE EXCEPTION 'Se requiere al menos un usuario activo asociado a una institución.';
    END IF;

    RAISE NOTICE 'Se crearon 12 solicitudes demo por institución.';
  END IF;
END $$;

COMMIT;

-- Para eliminar estos datos de prueba (solo en desarrollo):
-- DELETE FROM solicitudes_emergencia
-- WHERE motivo LIKE 'DEMO_HISTORICO_DONAVIDA:%';
-- solicitud_detalles se elimina en cascada.
