-- AlterTable
ALTER TABLE "turnos" ALTER COLUMN "estado" SET DEFAULT 'CONFIRMADO';
ALTER TABLE "turnos" ADD COLUMN "id_forma_pago_preferida" INTEGER;

-- AddForeignKey
ALTER TABLE "turnos" ADD CONSTRAINT "turnos_id_forma_pago_preferida_fkey" FOREIGN KEY ("id_forma_pago_preferida") REFERENCES "formas_pago"("idFormaPago") ON DELETE SET NULL ON UPDATE CASCADE;
