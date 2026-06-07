-- CreateTable
CREATE TABLE "servicios" (
    "idServicio" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "precio" DECIMAL(10,2) NOT NULL,
    "duracionMinutos" INTEGER NOT NULL,
    "urlImagen" TEXT,
    "vigente" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "servicios_pkey" PRIMARY KEY ("idServicio")
);

-- CreateTable
CREATE TABLE "turnos" (
    "idTurno" SERIAL NOT NULL,
    "idPersona" INTEGER NOT NULL,
    "fecha_hora_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_hora_fin" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "observacion" TEXT,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "turnos_pkey" PRIMARY KEY ("idTurno")
);

-- CreateTable
CREATE TABLE "turno_detalles" (
    "idTurnoDetalle" SERIAL NOT NULL,
    "idTurno" INTEGER NOT NULL,
    "idServicio" INTEGER NOT NULL,
    "precio_real" DECIMAL(10,2) NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "turno_detalles_pkey" PRIMARY KEY ("idTurnoDetalle")
);

-- CreateTable
CREATE TABLE "personas" (
    "idPersona" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "mail" TEXT,
    "telefono" TEXT,
    "fecha_nacimiento" DATE,
    "instagram" TEXT,
    "ultimo_corte" TIMESTAMP(3),
    "usuario" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personas_pkey" PRIMARY KEY ("idPersona")
);

-- CreateTable
CREATE TABLE "usuarios_web" (
    "usuario" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hash_pass" TEXT NOT NULL,
    "id_persona" INTEGER NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'PELUQUERO',

    CONSTRAINT "usuarios_web_pkey" PRIMARY KEY ("usuario")
);

-- CreateTable
CREATE TABLE "formas_pago" (
    "idFormaPago" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "requiere_comprobante" BOOLEAN NOT NULL DEFAULT false,
    "vigente" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "formas_pago_pkey" PRIMARY KEY ("idFormaPago")
);

-- CreateTable
CREATE TABLE "pagos" (
    "idPago" SERIAL NOT NULL,
    "idTurno" INTEGER NOT NULL,
    "idFormaPago" INTEGER NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "comprobante" TEXT,
    "fecha_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("idPago")
);

-- CreateTable
CREATE TABLE "movimientos_caja" (
    "idMovimiento" SERIAL NOT NULL,
    "fecha_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" TEXT NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "concepto" TEXT,
    "id_forma_pago" INTEGER NOT NULL,
    "id_usuario" TEXT NOT NULL,
    "id_turno" INTEGER,

    CONSTRAINT "movimientos_caja_pkey" PRIMARY KEY ("idMovimiento")
);

-- CreateTable
CREATE TABLE "cierres_caja" (
    "idCierre" SERIAL NOT NULL,
    "fecha" DATE NOT NULL,
    "hora_inicio" TIMESTAMP(3) NOT NULL,
    "hora_fin" TIMESTAMP(3) NOT NULL,
    "total_efectivo" DECIMAL(10,2) NOT NULL,
    "total_tarjeta" DECIMAL(10,2) NOT NULL,
    "total_transferencia" DECIMAL(10,2) NOT NULL,
    "total_otros" DECIMAL(10,2) NOT NULL,
    "total_esperado" DECIMAL(10,2) NOT NULL,
    "total_real" DECIMAL(10,2) NOT NULL,
    "diferencia" DECIMAL(10,2) NOT NULL,
    "id_usuario_cierra" TEXT NOT NULL,

    CONSTRAINT "cierres_caja_pkey" PRIMARY KEY ("idCierre")
);

-- CreateIndex
CREATE UNIQUE INDEX "personas_mail_key" ON "personas"("mail");

-- CreateIndex
CREATE UNIQUE INDEX "personas_usuario_key" ON "personas"("usuario");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_web_email_key" ON "usuarios_web"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_web_id_persona_key" ON "usuarios_web"("id_persona");

-- AddForeignKey
ALTER TABLE "turnos" ADD CONSTRAINT "turnos_idPersona_fkey" FOREIGN KEY ("idPersona") REFERENCES "personas"("idPersona") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turno_detalles" ADD CONSTRAINT "turno_detalles_idTurno_fkey" FOREIGN KEY ("idTurno") REFERENCES "turnos"("idTurno") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turno_detalles" ADD CONSTRAINT "turno_detalles_idServicio_fkey" FOREIGN KEY ("idServicio") REFERENCES "servicios"("idServicio") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_web" ADD CONSTRAINT "usuarios_web_id_persona_fkey" FOREIGN KEY ("id_persona") REFERENCES "personas"("idPersona") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_idTurno_fkey" FOREIGN KEY ("idTurno") REFERENCES "turnos"("idTurno") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_idFormaPago_fkey" FOREIGN KEY ("idFormaPago") REFERENCES "formas_pago"("idFormaPago") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_caja" ADD CONSTRAINT "movimientos_caja_id_forma_pago_fkey" FOREIGN KEY ("id_forma_pago") REFERENCES "formas_pago"("idFormaPago") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_caja" ADD CONSTRAINT "movimientos_caja_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios_web"("usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_caja" ADD CONSTRAINT "movimientos_caja_id_turno_fkey" FOREIGN KEY ("id_turno") REFERENCES "turnos"("idTurno") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cierres_caja" ADD CONSTRAINT "cierres_caja_id_usuario_cierra_fkey" FOREIGN KEY ("id_usuario_cierra") REFERENCES "usuarios_web"("usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
