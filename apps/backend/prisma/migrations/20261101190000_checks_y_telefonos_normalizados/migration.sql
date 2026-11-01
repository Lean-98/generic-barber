-- Normaliza los teléfonos que ya estaban cargados al mismo formato que usa
-- ahora la API (solo dígitos, sin ceros iniciales; ver is-telefono.decorator.ts).
UPDATE "personas"
SET "telefono" = NULLIF(regexp_replace(regexp_replace("telefono", '\D', '', 'g'), '^0+', ''), '')
WHERE "telefono" IS NOT NULL;

-- Restricciones CHECK: segunda capa de protección además de los DTOs, para
-- que un script, el seed o un error de código no puedan dejar datos que el
-- sistema no sabe manejar. Los límites acá son más amplios que en la API a
-- propósito (ej. duración > 0 acá, 5 a 180 en el DTO): la base solo frena lo
-- que nunca tiene sentido; la regla de negocio fina queda en el código.

-- Turnos
ALTER TABLE "turnos" ADD CONSTRAINT "turnos_estado_check"
  CHECK ("estado" IN ('PENDIENTE', 'CONFIRMADO', 'EN_PROCESO', 'COMPLETADO', 'CANCELADO', 'NO_SHOW'));
ALTER TABLE "turnos" ADD CONSTRAINT "turnos_fin_despues_de_inicio_check"
  CHECK ("fecha_hora_fin" > "fecha_hora_inicio");
ALTER TABLE "turnos" ADD CONSTRAINT "turnos_cancelado_por_check"
  CHECK ("cancelado_por" IS NULL OR "cancelado_por" IN ('CLIENTE', 'PANEL'));

-- Detalle de turnos
ALTER TABLE "turno_detalles" ADD CONSTRAINT "turno_detalles_precio_real_check"
  CHECK ("precio_real" >= 0);
ALTER TABLE "turno_detalles" ADD CONSTRAINT "turno_detalles_cantidad_check"
  CHECK ("cantidad" > 0);
ALTER TABLE "turno_detalles" ADD CONSTRAINT "turno_detalles_descuento_check"
  CHECK ("descuento_porcentaje" BETWEEN 0 AND 100);

-- Servicios e historial de precios
ALTER TABLE "servicios" ADD CONSTRAINT "servicios_precio_check"
  CHECK ("precio" >= 0);
ALTER TABLE "servicios" ADD CONSTRAINT "servicios_duracion_check"
  CHECK ("duracionMinutos" > 0);
ALTER TABLE "servicios_historial" ADD CONSTRAINT "servicios_historial_precio_check"
  CHECK ("precio" >= 0);
ALTER TABLE "servicios_historial" ADD CONSTRAINT "servicios_historial_duracion_check"
  CHECK ("duracionMinutos" > 0);

-- Catálogo
ALTER TABLE "productos" ADD CONSTRAINT "productos_precio_check"
  CHECK ("precio" >= 0);
ALTER TABLE "cursos" ADD CONSTRAINT "cursos_precio_check"
  CHECK ("precio" >= 0);
ALTER TABLE "cursos" ADD CONSTRAINT "cursos_cupos_check"
  CHECK ("cupos" IS NULL OR "cupos" >= 0);

-- Caja (los DTOs ya exigen montos positivos)
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_monto_check"
  CHECK ("monto" > 0);
ALTER TABLE "movimientos_caja" ADD CONSTRAINT "movimientos_caja_monto_check"
  CHECK ("monto" > 0);
ALTER TABLE "movimientos_caja" ADD CONSTRAINT "movimientos_caja_tipo_check"
  CHECK ("tipo" IN ('INGRESO', 'EGRESO'));

-- Configuración del negocio
ALTER TABLE "configuracion_negocio" ADD CONSTRAINT "configuracion_fidelizacion_visitas_check"
  CHECK ("fidelizacion_visitas_requeridas" IS NULL OR "fidelizacion_visitas_requeridas" > 0);
ALTER TABLE "configuracion_negocio" ADD CONSTRAINT "configuracion_fidelizacion_descuento_check"
  CHECK ("fidelizacion_descuento_porcentaje" IS NULL OR "fidelizacion_descuento_porcentaje" BETWEEN 0 AND 100);
ALTER TABLE "configuracion_negocio" ADD CONSTRAINT "configuracion_descuento_empleado_check"
  CHECK ("descuento_empleado_porcentaje" IS NULL OR "descuento_empleado_porcentaje" BETWEEN 0 AND 100);
ALTER TABLE "configuracion_negocio" ADD CONSTRAINT "configuracion_recordatorio_horas_check"
  CHECK ("recordatorio_horas_antes" > 0);
