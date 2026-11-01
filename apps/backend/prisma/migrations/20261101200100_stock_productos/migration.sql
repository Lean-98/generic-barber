-- AlterTable
ALTER TABLE "movimientos_caja" ADD COLUMN     "cantidad_producto" INTEGER,
ADD COLUMN     "id_producto" INTEGER;

-- AlterTable
ALTER TABLE "productos" ADD COLUMN     "stock" INTEGER,
ADD COLUMN     "stock_minimo" INTEGER;

-- AddForeignKey
ALTER TABLE "movimientos_caja" ADD CONSTRAINT "movimientos_caja_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "productos"("idProducto") ON DELETE SET NULL ON UPDATE CASCADE;

-- Restricciones (mismo criterio que 20261101190000_checks_y_telefonos_normalizados)
ALTER TABLE "productos" ADD CONSTRAINT "productos_stock_check" CHECK ("stock" IS NULL OR "stock" >= 0);
ALTER TABLE "productos" ADD CONSTRAINT "productos_stock_minimo_check" CHECK ("stock_minimo" IS NULL OR "stock_minimo" >= 0);
ALTER TABLE "movimientos_caja" ADD CONSTRAINT "movimientos_caja_cantidad_producto_check"
  CHECK ("cantidad_producto" IS NULL OR "cantidad_producto" > 0);
