-- CreateTable
CREATE TABLE "configuracion_negocio" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL DEFAULT 'Peluquería',
    "logo_url" TEXT,
    "icono_url" TEXT,
    "color_primario" TEXT,
    "color_secundario" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracion_negocio_pkey" PRIMARY KEY ("id")
);
