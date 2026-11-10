-- Recordatorio de que vence el cupón de cumpleaños.
-- AlterTable
ALTER TABLE "configuracion_negocio" ADD COLUMN     "cumple_dias_recordatorio" INTEGER NOT NULL DEFAULT 2;

-- AlterTable
ALTER TABLE "cupones" ADD COLUMN     "recordatorio_enviado_en" TIMESTAMP(3);


ALTER TABLE "configuracion_negocio" ADD CONSTRAINT "configuracion_cumple_recordatorio_check"
  CHECK ("cumple_dias_recordatorio" BETWEEN 0 AND 30);
