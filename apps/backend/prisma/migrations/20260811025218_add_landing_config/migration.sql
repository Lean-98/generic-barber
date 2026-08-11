-- AlterTable
ALTER TABLE "configuracion_negocio" ADD COLUMN     "descripcion" TEXT,
ADD COLUMN     "direccion" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "facebook_url" TEXT,
ADD COLUMN     "google_reviews_url" TEXT,
ADD COLUMN     "hero_image_url" TEXT,
ADD COLUMN     "horarios" JSONB,
ADD COLUMN     "instagram_url" TEXT,
ADD COLUMN     "politica_reservas" TEXT,
ADD COLUMN     "telefono" TEXT;
