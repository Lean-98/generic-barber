-- AlterTable: servicios
ALTER TABLE "servicios" ADD COLUMN "cuenta_para_fidelizacion" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: turno_detalles
ALTER TABLE "turno_detalles" ADD COLUMN "descuento_porcentaje" DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE "turno_detalles" ADD COLUMN "descuento_motivo" TEXT;

-- AlterTable: configuracion_negocio
ALTER TABLE "configuracion_negocio" ADD COLUMN "fidelizacion_activa" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "configuracion_negocio" ADD COLUMN "fidelizacion_visitas_requeridas" INTEGER;
ALTER TABLE "configuracion_negocio" ADD COLUMN "fidelizacion_descuento_porcentaje" DECIMAL(5,2);
ALTER TABLE "configuracion_negocio" ADD COLUMN "fidelizacion_fecha_inicio" DATE;
ALTER TABLE "configuracion_negocio" ADD COLUMN "descuento_empleado_activo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "configuracion_negocio" ADD COLUMN "descuento_empleado_porcentaje" DECIMAL(5,2);
