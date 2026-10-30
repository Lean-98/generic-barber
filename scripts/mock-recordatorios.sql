-- ============================================================
-- Mock data: circuito de recordatorio de turnos por email
-- ============================================================
-- Qué prueba cada turno que crea este script:
--   1. Dentro de la ventana de recordatorio      -> debería mandarse
--   2. Fuera de la ventana todavía                -> NO debería mandarse (por ahora)
--   3. Recordatorio ya enviado antes              -> NO debería duplicarse
--   4. Turno CANCELADO dentro de la ventana       -> NUNCA debería mandarse
--   5. Cliente sin mail cargado                   -> se saltea, no debe romper el cron
--
-- Esto prueba solo el RECORDATORIO (el cron de NotificationsService),
-- que lee la base directo. El email de CONFIRMACIÓN se dispara desde
-- turnos.service.ts al crear un turno por la app — insertar acá no lo
-- gatilla. Para probar la confirmación, reservá un turno real desde
-- /reservar o el panel admin.
--
-- ANTES DE CORRER:
--   Reemplazá TU-EMAIL-REAL@ejemplo.com por un mail real tuyo (control-F
--   y reemplazar), para poder revisar la bandeja de entrada.
--
--   Los horarios de prueba asumen recordatorio_horas_antes = 24 (el
--   default). Si lo cambiaste desde el panel admin, ajustá los
--   INTERVAL de más abajo para que el turno 1 caiga antes de esa
--   ventana y el turno 2 caiga después.
--
-- CÓMO CORRERLO:
--   docker exec -i <contenedor_db> psql -U <usuario> -d <db> -f scripts/mock-recordatorios.sql
--   (o pegalo directo en TablePlus / psql — es SQL estándar, sin
--   comandos propios de psql)
--
-- DESPUÉS DE CORRERLO:
--   El cron corre cada 15 min. Para no esperar, reiniciá el backend
--   (docker compose ... up -d backend) — el primer chequeo corre poco
--   después de arrancar igual, así que no hace falta más que eso.
--   Revisá la casilla de mail que pusiste.
--
-- LIMPIEZA: al final del archivo hay un bloque DELETE comentado para
-- sacar todo lo que crea este script, una vez que termines de probar.
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

persona_con_mail AS (
  INSERT INTO personas (nombre, apellido, mail, telefono, created_at, updated_at)
  VALUES ('Mock', 'Notificaciones', 'TU-EMAIL-REAL@ejemplo.com', '3510000000', now(), now())
  ON CONFLICT (mail) DO UPDATE SET updated_at = now()
  RETURNING "idPersona"
),

persona_sin_mail AS (
  INSERT INTO personas (nombre, apellido, usuario, telefono, created_at, updated_at)
  VALUES ('Mock', 'SinMail', 'mock_sinmail', '3510000001', now(), now())
  ON CONFLICT (usuario) DO UPDATE SET updated_at = now()
  RETURNING "idPersona"
),

-- 1. Dentro de la ventana (2hs antes del turno) -> debería recibir el recordatorio
turno_1 AS (
  INSERT INTO turnos ("idPersona", fecha_hora_inicio, fecha_hora_fin, estado, observacion, fecha_creacion)
  SELECT "idPersona", now() + interval '2 hours', now() + interval '2 hours 30 minutes',
         'CONFIRMADO', 'MOCK-NOTIFICACIONES: dentro de ventana, debería recibir recordatorio', now()
  FROM persona_con_mail
  RETURNING "idTurno"
),
-- 2. Fuera de la ventana todavía (30hs, con ventana de 24hs) -> no debería recibir aún
turno_2 AS (
  INSERT INTO turnos ("idPersona", fecha_hora_inicio, fecha_hora_fin, estado, observacion, fecha_creacion)
  SELECT "idPersona", now() + interval '30 hours', now() + interval '30 hours 30 minutes',
         'PENDIENTE', 'MOCK-NOTIFICACIONES: fuera de ventana todavía, no debería recibir aún', now()
  FROM persona_con_mail
  RETURNING "idTurno"
),
-- 3. Recordatorio ya enviado antes -> no debería duplicarse
turno_3 AS (
  INSERT INTO turnos ("idPersona", fecha_hora_inicio, fecha_hora_fin, estado, observacion, fecha_creacion, recordatorio_enviado_en)
  SELECT "idPersona", now() + interval '5 hours', now() + interval '5 hours 30 minutes',
         'CONFIRMADO', 'MOCK-NOTIFICACIONES: ya se mandó antes, no debería duplicarse', now(), now() - interval '1 hour'
  FROM persona_con_mail
  RETURNING "idTurno"
),
-- 4. Cancelado dentro de la ventana -> nunca debería recibir
turno_4 AS (
  INSERT INTO turnos ("idPersona", fecha_hora_inicio, fecha_hora_fin, estado, observacion, fecha_creacion)
  SELECT "idPersona", now() + interval '3 hours', now() + interval '3 hours 30 minutes',
         'CANCELADO', 'MOCK-NOTIFICACIONES: cancelado, nunca debería recibir', now()
  FROM persona_con_mail
  RETURNING "idTurno"
),
-- 5. Cliente sin mail cargado -> se saltea sin romper el cron
turno_5 AS (
  INSERT INTO turnos ("idPersona", fecha_hora_inicio, fecha_hora_fin, estado, observacion, fecha_creacion)
  SELECT "idPersona", now() + interval '4 hours', now() + interval '4 hours 30 minutes',
         'CONFIRMADO', 'MOCK-NOTIFICACIONES: cliente sin mail, no debería recibir', now()
  FROM persona_sin_mail
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
) t;

COMMIT;

-- ============================================================
-- LIMPIEZA — descomentar y correr aparte cuando termines de probar.
-- Borra solo lo que creó este script (identificado por el prefijo
-- "MOCK-NOTIFICACIONES" en observacion, y las dos personas de prueba).
-- ============================================================

-- BEGIN;
-- DELETE FROM turno_detalles WHERE "idTurno" IN (
--   SELECT "idTurno" FROM turnos WHERE observacion LIKE 'MOCK-NOTIFICACIONES%'
-- );
-- DELETE FROM turnos WHERE observacion LIKE 'MOCK-NOTIFICACIONES%';
-- DELETE FROM personas WHERE usuario = 'mock_sinmail';
-- DELETE FROM personas WHERE mail = 'TU-EMAIL-REAL@ejemplo.com';
-- COMMIT;
