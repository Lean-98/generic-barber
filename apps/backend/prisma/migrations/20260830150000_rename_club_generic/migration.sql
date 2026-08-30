-- Rename Authentic Club-specific column names to generic ones (prototype must not be tied to a brand name)
ALTER TABLE "configuracion_negocio" RENAME COLUMN "authentic_club_nombre" TO "club_nombre";
ALTER TABLE "configuracion_negocio" RENAME COLUMN "authentic_club_bajada" TO "club_bajada";
ALTER TABLE "configuracion_negocio" RENAME COLUMN "authentic_club_imagen_url" TO "club_imagen_url";
ALTER TABLE "configuracion_negocio" RENAME COLUMN "authentic_club_beneficios" TO "club_beneficios";
ALTER TABLE "configuracion_negocio" RENAME COLUMN "authentic_club_nota" TO "club_nota";
ALTER TABLE "configuracion_negocio" RENAME COLUMN "mostrar_authentic_club" TO "mostrar_club";
