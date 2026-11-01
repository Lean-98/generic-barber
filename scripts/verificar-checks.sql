-- Correr ANTES de aplicar la migración 20261101190000_checks_y_telefonos_normalizados
-- en una base con datos reales. Cada fila del resultado es una restricción que
-- fallaría y cuántas filas hay que corregir primero. Sin resultados = se puede migrar.
--
-- Uso (producción):
--   docker compose -f docker-compose.prod.yml exec -T db psql -U "$DB_USER" -d "$DB_NAME" < scripts/verificar-checks.sql
SELECT * FROM (
  SELECT 'turnos.estado' AS restriccion, count(*) AS filas FROM turnos
    WHERE estado NOT IN ('PENDIENTE','CONFIRMADO','EN_PROCESO','COMPLETADO','CANCELADO','NO_SHOW')
  UNION ALL SELECT 'turnos fin > inicio', count(*) FROM turnos WHERE fecha_hora_fin <= fecha_hora_inicio
  UNION ALL SELECT 'turno_detalles.precio_real >= 0', count(*) FROM turno_detalles WHERE precio_real < 0
  UNION ALL SELECT 'turno_detalles.cantidad > 0', count(*) FROM turno_detalles WHERE cantidad <= 0
  UNION ALL SELECT 'turno_detalles.descuento 0-100', count(*) FROM turno_detalles WHERE descuento_porcentaje NOT BETWEEN 0 AND 100
  UNION ALL SELECT 'servicios.precio >= 0', count(*) FROM servicios WHERE precio < 0
  UNION ALL SELECT 'servicios.duracion > 0', count(*) FROM servicios WHERE "duracionMinutos" <= 0
  UNION ALL SELECT 'servicios_historial', count(*) FROM servicios_historial WHERE precio < 0 OR "duracionMinutos" <= 0
  UNION ALL SELECT 'productos.precio >= 0', count(*) FROM productos WHERE precio < 0
  UNION ALL SELECT 'cursos.precio/cupos', count(*) FROM cursos WHERE precio < 0 OR cupos < 0
  UNION ALL SELECT 'pagos.monto > 0', count(*) FROM pagos WHERE monto <= 0
  UNION ALL SELECT 'movimientos_caja monto/tipo', count(*) FROM movimientos_caja WHERE monto <= 0 OR tipo NOT IN ('INGRESO','EGRESO')
  UNION ALL SELECT 'configuracion_negocio', count(*) FROM configuracion_negocio
    WHERE fidelizacion_visitas_requeridas <= 0
       OR fidelizacion_descuento_porcentaje NOT BETWEEN 0 AND 100
       OR descuento_empleado_porcentaje NOT BETWEEN 0 AND 100
       OR recordatorio_horas_antes <= 0
) v WHERE filas > 0;

-- Teléfonos que después de normalizar no quedan entre 8 y 15 dígitos. No
-- frenan la migración, pero esas personas no se van a poder editar desde el
-- panel hasta que se les corrija el teléfono.
SELECT "idPersona", nombre, apellido, telefono
FROM personas
WHERE telefono IS NOT NULL
  AND length(regexp_replace(regexp_replace(telefono, '\D', '', 'g'), '^0+', '')) NOT BETWEEN 8 AND 15;
