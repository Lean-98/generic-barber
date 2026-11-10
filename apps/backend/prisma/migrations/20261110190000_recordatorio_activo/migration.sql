-- Permite apagar el recordatorio de turno por email.
ALTER TABLE "configuracion_negocio" ADD COLUMN "recordatorio_activo" BOOLEAN NOT NULL DEFAULT true;
