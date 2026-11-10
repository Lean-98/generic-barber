-- Beneficio de cumpleaños (cupón personal automático) y consentimiento para promociones.
-- AlterTable
ALTER TABLE "personas" ADD COLUMN     "recibe_promociones" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "configuracion_negocio" ADD COLUMN     "cumple_activo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cumple_descuento_porcentaje" DECIMAL(5,2) NOT NULL DEFAULT 20,
ADD COLUMN     "cumple_dias_anticipacion" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "cumple_dias_validez" INTEGER NOT NULL DEFAULT 7;

-- AlterTable
ALTER TABLE "cupones" ADD COLUMN     "anio_cumpleanos" INTEGER,
ADD COLUMN     "id_persona" INTEGER,
ADD COLUMN     "origen" TEXT NOT NULL DEFAULT 'PROMO';

-- CreateIndex
CREATE UNIQUE INDEX "cupones_id_persona_anio_cumpleanos_key" ON "cupones"("id_persona", "anio_cumpleanos");

-- AddForeignKey
ALTER TABLE "cupones" ADD CONSTRAINT "cupones_id_persona_fkey" FOREIGN KEY ("id_persona") REFERENCES "personas"("idPersona") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "configuracion_negocio" ADD CONSTRAINT "configuracion_cumple_check"
  CHECK ("cumple_descuento_porcentaje" > 0 AND "cumple_descuento_porcentaje" <= 100
     AND "cumple_dias_anticipacion" BETWEEN 0 AND 30
     AND "cumple_dias_validez" BETWEEN 1 AND 60);
ALTER TABLE "cupones" ADD CONSTRAINT "cupones_origen_check"
  CHECK ("origen" IN ('PROMO', 'CUMPLEANOS'));
