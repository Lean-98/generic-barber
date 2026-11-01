-- AlterTable
ALTER TABLE "servicios" ADD COLUMN     "costo_insumos" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "costos_negocio" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "costos_fijos_mensuales" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "costo_hora_trabajo" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "costos_negocio_pkey" PRIMARY KEY ("id")
);

-- Restricciones (mismo criterio que 20261101190000_checks_y_telefonos_normalizados)
ALTER TABLE "servicios" ADD CONSTRAINT "servicios_costo_insumos_check" CHECK ("costo_insumos" >= 0);
ALTER TABLE "costos_negocio" ADD CONSTRAINT "costos_negocio_valores_check"
  CHECK ("costos_fijos_mensuales" >= 0 AND "costo_hora_trabajo" >= 0);
ALTER TABLE "costos_negocio" ADD CONSTRAINT "costos_negocio_fila_unica_check" CHECK ("id" = 1);
