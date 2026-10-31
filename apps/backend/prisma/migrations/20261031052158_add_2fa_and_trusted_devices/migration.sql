-- AlterTable
ALTER TABLE "usuarios_web" ADD COLUMN     "two_factor_code_expires_at" TIMESTAMP(3),
ADD COLUMN     "two_factor_code_hash" TEXT;

-- CreateTable
CREATE TABLE "dispositivos_confiables" (
    "id" SERIAL NOT NULL,
    "usuario" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expira_en" TIMESTAMP(3) NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispositivos_confiables_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dispositivos_confiables_token_hash_key" ON "dispositivos_confiables"("token_hash");

-- AddForeignKey
ALTER TABLE "dispositivos_confiables" ADD CONSTRAINT "dispositivos_confiables_usuario_fkey" FOREIGN KEY ("usuario") REFERENCES "usuarios_web"("usuario") ON DELETE CASCADE ON UPDATE CASCADE;
