-- Anticipación mínima para reservar online, configurable por el negocio.
ALTER TABLE "configuracion_negocio" ADD COLUMN "reserva_anticipacion_minutos" INTEGER NOT NULL DEFAULT 15;

ALTER TABLE "configuracion_negocio" ADD CONSTRAINT "configuracion_reserva_anticipacion_check"
  CHECK ("reserva_anticipacion_minutos" BETWEEN 0 AND 1440);
