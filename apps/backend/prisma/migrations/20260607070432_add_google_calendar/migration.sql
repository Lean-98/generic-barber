-- AlterTable
ALTER TABLE "turnos" ADD COLUMN     "google_event_id" TEXT;

-- CreateTable
CREATE TABLE "google_calendar_config" (
    "id" SERIAL NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "expiry_date" TIMESTAMP(3),
    "calendar_id" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_calendar_config_pkey" PRIMARY KEY ("id")
);
