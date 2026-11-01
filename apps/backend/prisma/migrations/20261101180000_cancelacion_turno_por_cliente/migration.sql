-- AlterTable
ALTER TABLE "turnos" ADD COLUMN "cancelado_en" TIMESTAMP(3);
ALTER TABLE "turnos" ADD COLUMN "cancelado_por" TEXT;
