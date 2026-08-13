-- AlterTable
ALTER TABLE "usuarios_web" ADD COLUMN     "reset_token_expires_at" TIMESTAMP(3),
ADD COLUMN     "reset_token_hash" TEXT;
