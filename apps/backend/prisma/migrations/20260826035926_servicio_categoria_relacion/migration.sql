-- CreateTable
CREATE TABLE "categorias_servicios" (
    "idCategoria" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "vigente" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorias_servicios_pkey" PRIMARY KEY ("idCategoria")
);

-- AlterTable
ALTER TABLE "servicios" ADD COLUMN "id_categoria" INTEGER;

-- AddForeignKey
ALTER TABLE "servicios" ADD CONSTRAINT "servicios_id_categoria_fkey" FOREIGN KEY ("id_categoria") REFERENCES "categorias_servicios"("idCategoria") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropColumn
ALTER TABLE "servicios" DROP COLUMN "categoria";
