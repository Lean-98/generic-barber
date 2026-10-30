-- AlterTable
ALTER TABLE "configuracion_negocio" ADD COLUMN     "recordatorio_horas_antes" INTEGER NOT NULL DEFAULT 24;

-- AlterTable
ALTER TABLE "turnos" ADD COLUMN     "recordatorio_enviado_en" TIMESTAMP(3);
