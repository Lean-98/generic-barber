-- AlterTable
ALTER TABLE "configuracion_negocio" ADD COLUMN     "cursos_descripcion" TEXT,
ADD COLUMN     "cursos_titulo" TEXT,
ADD COLUMN     "productos_descripcion" TEXT,
ADD COLUMN     "productos_titulo" TEXT;

-- CreateTable
CREATE TABLE "categorias" (
    "idCategoria" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "vigente" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("idCategoria")
);

-- CreateTable
CREATE TABLE "productos" (
    "idProducto" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "precio" DECIMAL(10,2) NOT NULL,
    "urlImagen" TEXT,
    "id_categoria" INTEGER,
    "vigente" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("idProducto")
);

-- CreateTable
CREATE TABLE "cursos" (
    "idCurso" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "precio" DECIMAL(10,2) NOT NULL,
    "duracion" TEXT,
    "urlImagen" TEXT,
    "vigente" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cursos_pkey" PRIMARY KEY ("idCurso")
);

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_id_categoria_fkey" FOREIGN KEY ("id_categoria") REFERENCES "categorias"("idCategoria") ON DELETE SET NULL ON UPDATE CASCADE;
