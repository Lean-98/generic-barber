-- AlterTable
ALTER TABLE "servicios" ADD COLUMN     "categoria" TEXT;

-- CreateTable
CREATE TABLE "servicios_historial" (
    "idHistorial" SERIAL NOT NULL,
    "idServicio" INTEGER NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,
    "duracionMinutos" INTEGER NOT NULL,
    "vigente" BOOLEAN NOT NULL,
    "fecha_cambio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "servicios_historial_pkey" PRIMARY KEY ("idHistorial")
);

-- AddForeignKey
ALTER TABLE "servicios_historial" ADD CONSTRAINT "servicios_historial_idServicio_fkey" FOREIGN KEY ("idServicio") REFERENCES "servicios"("idServicio") ON DELETE CASCADE ON UPDATE CASCADE;
