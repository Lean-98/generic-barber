-- ============================================================
-- Mock data: circuito de transiciones automáticas de turno por reloj
-- ============================================================
-- Qué prueba cada turno que crea este script (TurnosCronService,
-- corre cada 5 min):
--   1. CONFIRMADO cuya hora de inicio ya pasó  -> debería pasar a EN_PROCESO
--   2. EN_PROCESO cuya hora de fin ya pasó      -> debería pasar a COMPLETADO
--   3. CONFIRMADO cuya hora de inicio es futura -> NO debería tocarse todavía
--   4. PENDIENTE rezagado (de antes del cambio) -> debería barrerse a CONFIRMADO
--      (aunque su horario sea futuro: el barrido no mira la hora, solo el estado)
--   5. CANCELADO con horario ya vencido          -> NUNCA debería tocarse (excepción manual)
--   6. NO_SHOW con horario ya vencido            -> NUNCA debería tocarse (excepción manual)
--
-- CÓMO CORRERLO:
--   docker exec -i peluqueria-db psql -U peluquero -d peluqueria -f scripts/mock-auto-transiciones.sql
--
-- DESPUÉS DE CORRERLO:
--   El cron corre cada 5 min. Para no esperar, reiniciá el backend
--   (docker compose ... up -d backend) no hace falta; alcanza con esperar
--   al próximo tick, o levantar el backend si no estaba corriendo.
--   Revisá el estado con:
--     docker exec -i peluqueria-db psql -U peluquero -d peluqueria -c \
--       "SELECT \"idTurno\", estado, observacion FROM turnos WHERE observacion LIKE 'MOCK-AUTOTRANSICION%' ORDER BY \"idTurno\";"
--
-- LIMPIEZA: al final del archivo hay un bloque DELETE comentado.
-- ============================================================

BEGIN;

WITH servicio_fallback AS (
  INSERT INTO servicios (nombre, precio, "duracionMinutos", vigente, created_at, updated_at)
  SELECT 'Corte de pelo', 10000, 30, true, now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM servicios)
  RETURNING "idServicio"
),
servicio AS (
  SELECT "idServicio" FROM servicio_fallback
  UNION ALL
  SELECT "idServicio" FROM servicios WHERE vigente = true LIMIT 1
),

persona AS (
  INSERT INTO personas (nombre, apellido, usuario, telefono, created_at, updated_at)
  VALUES ('Mock', 'AutoTransicion', 'mock_autotransicion', '3510000002', now(), now())
  ON CONFLICT (usuario) DO UPDATE SET updated_at = now()
  RETURNING "idPersona"
),

-- 1. CONFIRMADO, empezó hace 10 min -> debería pasar a EN_PROCESO
turno_1 AS (
  INSERT INTO turnos ("idPersona", fecha_hora_inicio, fecha_hora_fin, estado, observacion, fecha_creacion)
  SELECT "idPersona", now() - interval '10 minutes', now() + interval '20 minutes',
         'CONFIRMADO', 'MOCK-AUTOTRANSICION: ya empezó, debería pasar a EN_PROCESO', now()
  FROM persona
  RETURNING "idTurno"
),
-- 2. EN_PROCESO, terminó hace 5 min -> debería pasar a COMPLETADO
turno_2 AS (
  INSERT INTO turnos ("idPersona", fecha_hora_inicio, fecha_hora_fin, estado, observacion, fecha_creacion)
  SELECT "idPersona", now() - interval '35 minutes', now() - interval '5 minutes',
         'EN_PROCESO', 'MOCK-AUTOTRANSICION: ya terminó, debería pasar a COMPLETADO', now()
  FROM persona
  RETURNING "idTurno"
),
-- 3. CONFIRMADO, empieza en 1 hora -> no debería tocarse todavía
turno_3 AS (
  INSERT INTO turnos ("idPersona", fecha_hora_inicio, fecha_hora_fin, estado, observacion, fecha_creacion)
  SELECT "idPersona", now() + interval '1 hour', now() + interval '1 hour 30 minutes',
         'CONFIRMADO', 'MOCK-AUTOTRANSICION: todavia no empieza, no debería tocarse', now()
  FROM persona
  RETURNING "idTurno"
),
-- 4. PENDIENTE rezagado (horario futuro a propósito, para distinguir
--    "se movió por el barrido de PENDIENTE" de "se movió porque ya empezó")
--    -> debería barrerse a CONFIRMADO en el próximo tick
turno_4 AS (
  INSERT INTO turnos ("idPersona", fecha_hora_inicio, fecha_hora_fin, estado, observacion, fecha_creacion)
  SELECT "idPersona", now() + interval '2 hours', now() + interval '2 hours 30 minutes',
         'PENDIENTE', 'MOCK-AUTOTRANSICION: pendiente rezagado, debería barrerse a CONFIRMADO', now()
  FROM persona
  RETURNING "idTurno"
),
-- 5. CANCELADO con horario vencido -> nunca debería tocarse
turno_5 AS (
  INSERT INTO turnos ("idPersona", fecha_hora_inicio, fecha_hora_fin, estado, observacion, fecha_creacion)
  SELECT "idPersona", now() - interval '1 hour', now() - interval '30 minutes',
         'CANCELADO', 'MOCK-AUTOTRANSICION: cancelado, nunca debería tocarse', now()
  FROM persona
  RETURNING "idTurno"
),
-- 6. NO_SHOW con horario vencido -> nunca debería tocarse
turno_6 AS (
  INSERT INTO turnos ("idPersona", fecha_hora_inicio, fecha_hora_fin, estado, observacion, fecha_creacion)
  SELECT "idPersona", now() - interval '1 hour', now() - interval '30 minutes',
         'NO_SHOW', 'MOCK-AUTOTRANSICION: no show, nunca debería tocarse', now()
  FROM persona
  RETURNING "idTurno"
)

INSERT INTO turno_detalles ("idTurno", "idServicio", precio_real, cantidad, descuento_porcentaje)
SELECT t."idTurno", s."idServicio", 10000, 1, 0
FROM servicio s
CROSS JOIN (
  SELECT "idTurno" FROM turno_1
  UNION ALL SELECT "idTurno" FROM turno_2
  UNION ALL SELECT "idTurno" FROM turno_3
  UNION ALL SELECT "idTurno" FROM turno_4
  UNION ALL SELECT "idTurno" FROM turno_5
  UNION ALL SELECT "idTurno" FROM turno_6
) t;

COMMIT;

-- ============================================================
-- LIMPIEZA — descomentar y correr aparte cuando termines de probar.
-- ============================================================

-- BEGIN;
-- DELETE FROM turno_detalles WHERE "idTurno" IN (
--   SELECT "idTurno" FROM turnos WHERE observacion LIKE 'MOCK-AUTOTRANSICION%'
-- );
-- DELETE FROM turnos WHERE observacion LIKE 'MOCK-AUTOTRANSICION%';
-- DELETE FROM personas WHERE usuario = 'mock_autotransicion';
-- COMMIT;
