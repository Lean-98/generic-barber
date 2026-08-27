-- AlterTable
ALTER TABLE "cursos" ADD COLUMN "subtitulo" TEXT,
ADD COLUMN "temario" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "fecha_inicio" TEXT,
ADD COLUMN "dia_cursada" TEXT,
ADD COLUMN "horario" TEXT,
ADD COLUMN "lugar" TEXT,
ADD COLUMN "cupos" INTEGER,
ADD COLUMN "requisito_importante" TEXT;
