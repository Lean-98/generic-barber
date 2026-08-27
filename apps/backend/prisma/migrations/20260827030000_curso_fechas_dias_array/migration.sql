-- AlterTable: fecha_inicio TEXT -> TIMESTAMP
ALTER TABLE "cursos" ALTER COLUMN "fecha_inicio" DROP DEFAULT;
ALTER TABLE "cursos" ALTER COLUMN "fecha_inicio" TYPE TIMESTAMP(3) USING NULL::TIMESTAMP(3);

-- AlterTable: dia_cursada TEXT -> TEXT[]
ALTER TABLE "cursos" ALTER COLUMN "dia_cursada" DROP DEFAULT;
ALTER TABLE "cursos" ALTER COLUMN "dia_cursada" TYPE TEXT[] USING CASE WHEN "dia_cursada" IS NULL THEN ARRAY[]::TEXT[] ELSE ARRAY["dia_cursada"] END;
ALTER TABLE "cursos" ALTER COLUMN "dia_cursada" SET DEFAULT ARRAY[]::TEXT[];

-- AlterTable: new columns
ALTER TABLE "cursos" ADD COLUMN "fecha_fin" TIMESTAMP(3),
ADD COLUMN "inscripcion_inicio" TIMESTAMP(3),
ADD COLUMN "inscripcion_hasta" TIMESTAMP(3);
