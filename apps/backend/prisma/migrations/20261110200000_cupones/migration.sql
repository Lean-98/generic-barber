-- Cupones de descuento para la reserva online.
-- AlterTable
ALTER TABLE "turnos" ADD COLUMN     "id_cupon" INTEGER;

-- CreateTable
CREATE TABLE "cupones" (
    "idCupon" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT,
    "descuento_porcentaje" DECIMAL(5,2) NOT NULL,
    "vigente_desde" TIMESTAMP(3) NOT NULL,
    "vigente_hasta" TIMESTAMP(3) NOT NULL,
    "usos_maximos" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cupones_pkey" PRIMARY KEY ("idCupon")
);

-- CreateIndex
CREATE UNIQUE INDEX "cupones_codigo_key" ON "cupones"("codigo");

-- CreateIndex
CREATE INDEX "turnos_id_cupon_idx" ON "turnos"("id_cupon");

-- AddForeignKey
ALTER TABLE "turnos" ADD CONSTRAINT "turnos_id_cupon_fkey" FOREIGN KEY ("id_cupon") REFERENCES "cupones"("idCupon") ON DELETE SET NULL ON UPDATE CASCADE;


-- Reglas que el panel ya valida, también en la base.
ALTER TABLE "cupones" ADD CONSTRAINT "cupones_descuento_check"
  CHECK ("descuento_porcentaje" > 0 AND "descuento_porcentaje" <= 100);
ALTER TABLE "cupones" ADD CONSTRAINT "cupones_vigencia_check"
  CHECK ("vigente_hasta" > "vigente_desde");
ALTER TABLE "cupones" ADD CONSTRAINT "cupones_usos_check"
  CHECK ("usos_maximos" IS NULL OR "usos_maximos" > 0);
ALTER TABLE "cupones" ADD CONSTRAINT "cupones_codigo_check"
  CHECK ("codigo" ~ '^[A-Z0-9_-]{3,30}$');
