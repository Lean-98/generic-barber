/**
 * Datos de prueba para cupones, beneficio de cumpleaños y club (SOLO DESARROLLO).
 *
 *   npm run mock:cumple              crea los datos (si ya estaban, los rehace)
 *   npm run mock:cumple -- procesar  corre ya la tarea diaria de las 10:00 (cupones y recordatorios)
 *   npm run mock:cumple -- limpiar   borra todo lo de prueba y restaura la configuración
 *
 * Las fechas son relativas a hoy, así que sirve cualquier día. Los clientes
 * de prueba usan direcciones de prueba de Resend (delivered+...@resend.dev):
 * los mails se "entregan" sin llegarle a nadie. Se reconocen por ese email
 * (o por apellido Mock y teléfono 351555…, los que no tienen) y los cupones de promo,
 * por el prefijo MOCK.
 */
import 'dotenv/config';
import 'reflect-metadata';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Prisma, PrismaClient } from '@prisma/client';
import { finDiaAr, horaArAUtc, hoyAr, inicioDiaAr } from '../src/common/utils/fecha-ar.util';

const prisma = new PrismaClient();
const EMAIL = (n: string) => `delivered+mock-cumple-${n}@resend.dev`;
const EMAIL_PATRON = 'delivered+mock-cumple-';
/** Los clientes de prueba se llaman "X Mock" y tienen teléfono 351555…: así se reconocen también los que no tienen email. */
const APELLIDO = 'Mock';
const PREFIJO_TELEFONO = '351555';
const PREFIJO_PROMO = 'MOCK';
const RESPALDO = join(tmpdir(), 'authentic-barber-mock-cumple-config.json');
const CONFIG_ID = 1;

const hoy = hoyAr();
const dia = (n: number) => new Date(hoy.getTime() + n * 86_400_000);
/** Fecha de nacimiento para que el cumple caiga dentro de `n` días (n negativo = ya pasó). */
const nacioPara = (n: number, edad: number) => {
  const f = dia(n);
  return new Date(Date.UTC(f.getUTCFullYear() - edad, f.getUTCMonth(), f.getUTCDate()));
};
const ddmm = (f: Date) => `${String(f.getUTCDate()).padStart(2, '0')}/${String(f.getUTCMonth() + 1).padStart(2, '0')}`;

function verificarEntorno(): void {
  const url = process.env.DATABASE_URL ?? '';
  if (process.env.NODE_ENV === 'production' || !/@(localhost|127\.0\.0\.1|db|peluqueria-db)[:/]/.test(url)) {
    console.error('Este script es solo para la base de desarrollo (DATABASE_URL en localhost). No se tocó nada.');
    process.exit(1);
  }
}

// ─── limpiar ───

async function limpiar(restaurarConfig = true): Promise<void> {
  const personas = await prisma.persona.findMany({
    where: { OR: [{ mail: { startsWith: EMAIL_PATRON } }, { apellido: APELLIDO, telefono: { startsWith: PREFIJO_TELEFONO } }] },
    select: { idPersona: true },
  });
  const ids = personas.map((p) => p.idPersona);
  const promos = await prisma.cupon.findMany({ where: { codigo: { startsWith: PREFIJO_PROMO }, origen: 'PROMO' }, select: { idCupon: true } });
  const idsPromo = promos.map((c) => c.idCupon);

  const turnos = await prisma.turno.findMany({
    where: { OR: [{ idPersona: { in: ids } }, { idCupon: { in: idsPromo } }] },
    select: { idTurno: true },
  });
  const idsTurno = turnos.map((t) => t.idTurno);

  await prisma.$transaction([
    prisma.movimientoCaja.deleteMany({ where: { idTurno: { in: idsTurno } } }),
    prisma.pago.deleteMany({ where: { idTurno: { in: idsTurno } } }),
    prisma.turno.deleteMany({ where: { idTurno: { in: idsTurno } } }),
    prisma.cupon.deleteMany({ where: { OR: [{ idPersona: { in: ids } }, { idCupon: { in: idsPromo } }] } }),
    prisma.persona.deleteMany({ where: { idPersona: { in: ids } } }),
  ]);
  console.log(`Borrado: ${ids.length} clientes, ${idsTurno.length} turnos y los cupones de prueba.`);

  if (restaurarConfig && existsSync(RESPALDO)) {
    const original = JSON.parse(readFileSync(RESPALDO, 'utf8'));
    await prisma.configuracionNegocio.update({ where: { id: CONFIG_ID }, data: original });
    unlinkSync(RESPALDO);
    console.log('Configuración del beneficio de cumpleaños y del club restaurada.');
  }
}

// ─── crear ───

async function crear(): Promise<void> {
  await limpiar(false);

  const config = await prisma.configuracionNegocio.findUnique({ where: { id: CONFIG_ID } });
  if (!config) throw new Error('No hay configuración del negocio: corré primero npx prisma db seed');
  if (!existsSync(RESPALDO)) {
    const campos = {
      cumpleActivo: config.cumpleActivo,
      cumpleDescuentoPorcentaje: Number(config.cumpleDescuentoPorcentaje),
      cumpleDiasAnticipacion: config.cumpleDiasAnticipacion,
      cumpleDiasValidez: config.cumpleDiasValidez,
      cumpleDiasRecordatorio: config.cumpleDiasRecordatorio,
      fidelizacionActiva: config.fidelizacionActiva,
      fidelizacionVisitasRequeridas: config.fidelizacionVisitasRequeridas,
      fidelizacionDescuentoPorcentaje: config.fidelizacionDescuentoPorcentaje == null ? null : Number(config.fidelizacionDescuentoPorcentaje),
      fidelizacionFechaInicio: config.fidelizacionFechaInicio,
    };
    writeFileSync(RESPALDO, JSON.stringify(campos));
  }
  await prisma.configuracionNegocio.update({
    where: { id: CONFIG_ID },
    data: {
      cumpleActivo: true,
      cumpleDescuentoPorcentaje: 20,
      cumpleDiasAnticipacion: 3,
      cumpleDiasValidez: 7,
      cumpleDiasRecordatorio: 2,
      fidelizacionActiva: true,
      fidelizacionVisitasRequeridas: 5,
      fidelizacionDescuentoPorcentaje: 50,
      fidelizacionFechaInicio: null,
    },
  });

  const servicio = await prisma.servicio.findFirst({ where: { vigente: true, cuentaParaFidelizacion: true }, orderBy: { idServicio: 'asc' } });
  if (!servicio) throw new Error('No hay ningún servicio vigente que sume al club: marcá uno en Servicios o corré el seed.');
  const formaPago = await prisma.formaPago.findFirst({ where: { vigente: true } });

  const persona = (n: string, nombre: string, extra: Partial<Prisma.PersonaCreateInput> = {}) =>
    prisma.persona.create({
      data: { nombre, apellido: APELLIDO, mail: EMAIL(n), telefono: `${PREFIJO_TELEFONO}${String(Math.floor(1000 + Math.random() * 8999))}`, ...extra },
    });

  /** Turno completado hace `diasAtras` días a las 10:00, con o sin cupón (el descuento va en el detalle). */
  const turnoPasado = async (idPersona: number, diasAtras: number, cupon?: { idCupon: number; porcentaje: number }) => {
    const inicio = horaArAUtc(dia(-diasAtras), 10, 0);
    return prisma.turno.create({
      data: {
        idPersona,
        fechaHoraInicio: inicio,
        fechaHoraFin: new Date(inicio.getTime() + servicio.duracionMinutos * 60_000),
        estado: 'COMPLETADO',
        observacion: 'MOCK-CUMPLE',
        idFormaPagoPreferida: formaPago?.idFormaPago,
        idCupon: cupon?.idCupon,
        detalles: {
          create: [
            {
              idServicio: servicio.idServicio,
              precioReal: servicio.precio,
              cantidad: 1,
              descuentoPorcentaje: cupon?.porcentaje ?? 0,
              descuentoMotivo: cupon ? 'CUPON' : null,
            },
          ],
        },
      },
    });
  };

  const cuponCumple = (idPersona: number, nombre: string, cumple: Date, desde: Date, hasta: Date, creadoHaceDias: number) =>
    prisma.cupon.create({
      data: {
        codigo: `CUMPLE-${nombre.toUpperCase()}-MOCK`,
        descripcion: `Cumpleaños ${ddmm(cumple)}`,
        descuentoPorcentaje: 20,
        vigenteDesde: inicioDiaAr(desde),
        vigenteHasta: finDiaAr(hasta),
        usosMaximos: 1,
        origen: 'CUMPLEANOS',
        idPersona,
        anioCumpleanos: cumple.getUTCFullYear(),
        createdAt: horaArAUtc(dia(-creadoHaceDias), 10, 0),
      },
    });

  // Cumpleaños para el Dashboard y la tarea diaria.
  await persona('ana', 'Ana', { fechaNacimiento: nacioPara(0, 30) });
  await persona('bruno', 'Bruno', { fechaNacimiento: nacioPara(3, 25) });
  await persona('carla', 'Carla', { fechaNacimiento: nacioPara(6, 41) });
  await persona('diego', 'Diego', { mail: null, fechaNacimiento: nacioPara(2, 35) });
  await persona('elena', 'Elena', { fechaNacimiento: nacioPara(1, 28), recibePromociones: false });
  await persona('fede', 'Fede', { fechaNacimiento: nacioPara(2, 33), aplicaDescuentoPersonal: true });

  // Cupón de cumpleaños sin usar que vence mañana: le toca el recordatorio.
  const gabi = await persona('gabi', 'Gabi', { fechaNacimiento: nacioPara(-2, 27) });
  await cuponCumple(gabi.idPersona, 'Gabi', dia(-2), dia(-5), dia(1), 5);

  // Cupón de cumpleaños ya usado en un turno completado ayer (reporte y caja).
  const hugo = await persona('hugo', 'Hugo', { fechaNacimiento: nacioPara(-1, 45) });
  const cuponHugo = await cuponCumple(hugo.idPersona, 'Hugo', dia(-1), dia(-4), dia(2), 4);
  await turnoPasado(hugo.idPersona, 1, { idCupon: cuponHugo.idCupon, porcentaje: 20 });

  // Cumple más adelante este mes (o al principio, si ya es fin de mes): filtro "Cumplen este mes".
  const finDeMes = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() + 1, 0)).getUTCDate();
  const diaIris = hoy.getUTCDate() + 10 <= finDeMes ? 10 : -(hoy.getUTCDate() - 1);
  await persona('iris', 'Iris', { fechaNacimiento: nacioPara(diaIris, 22) });

  // Club: 4 visitas hechas, la próxima tiene 50%.
  const juli = await persona('juli', 'Juli');
  for (const atras of [100, 70, 40, 10]) await turnoPasado(juli.idPersona, atras);

  // Cupones de promo en todos los estados.
  const promo = (codigo: string, descripcion: string, porcentaje: number, desde: Date, hasta: Date, extra: Partial<Prisma.CuponCreateInput> = {}) =>
    prisma.cupon.create({
      data: { codigo, descripcion, descuentoPorcentaje: porcentaje, vigenteDesde: inicioDiaAr(desde), vigenteHasta: finDiaAr(hasta), ...extra },
    });
  const finMes = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() + 1, 0));
  await promo('MOCKHOY20', 'Solo por hoy 20% off en tu corte', 20, hoy, hoy);
  await promo('MOCKMES10', '10% todo el mes', 10, hoy, finMes, { usosMaximos: 10 });
  await promo('MOCKVENCIDO', 'Promo de la semana pasada', 15, dia(-8), dia(-2));
  await promo('MOCKFINDE', 'Promo del finde que viene', 25, dia(4), dia(6));
  await promo('MOCKPAUSA', 'Promo pausada', 30, hoy, dia(10), { activo: false });
  const agotado = await promo('MOCKAGOTADO', 'Solo para el primero', 50, dia(-3), dia(5), { usosMaximos: 1 });
  const kevin = await persona('kevin', 'Kevin');
  await turnoPasado(kevin.idPersona, 2, { idCupon: agotado.idCupon, porcentaje: 50 });

  console.log(`
Listo. Datos de prueba creados (hoy es ${ddmm(hoy)}). Beneficio de cumpleaños activo (20%, 3 días antes, 7 de
validez, recordatorio 2 días antes) y club activo (5 visitas, 50%). Reiniciá el backend si estaba corriendo.

Qué mirar:
  Dashboard        → "Cumpleaños de esta semana": Ana (hoy), Elena (no acepta promos), Diego (sin email,
                     WhatsApp solo saludo), Fede (empleado), Bruno y Carla. Ana y Bruno no tienen cupón
                     todavía: corré "procesar".
  procesar         → npm run mock:cumple -- procesar
                     Genera y manda el cupón de Ana y de Bruno (Carla todavía no: faltan 6 días; Diego,
                     Elena y Fede no corresponden) y el recordatorio de Gabi (vence mañana).
  Cupones          → MOCKHOY20 (activo), MOCKMES10 (cupo 10), MOCKFINDE (programado), MOCKPAUSA (pausado),
                     MOCKVENCIDO (vencido), MOCKAGOTADO (agotado). "Ver los de cumpleaños": Gabi y Hugo
                     (y Ana y Bruno después de procesar).
  /reservar        → con ?cupon=MOCKHOY20 viene aplicado. Con ${EMAIL('juli')} sale "¡Tu próxima
                     visita tiene 50% de descuento!" (club). CUMPLE-GABI-MOCK solo funciona con
                     ${EMAIL('gabi')}; con otro email dice que es personal.
  Clientes         → "🎂 Cumplen este mes".
  Reportes         → período de este mes: "Beneficio de cumpleaños" (Hugo lo usó) y en Rentabilidad
                     lo que costaron los cupones (cumpleaños y promo).
  Club             → la tarjeta de cumpleaños armada desde la configuración.

Al terminar: npm run mock:cumple -- limpiar
`);
}

// ─── procesar ───

async function procesar(): Promise<void> {
  // La tarea real, con el mail real: arma solo lo que necesita CumpleanosService.
  const { NestFactory } = await import('@nestjs/core');
  const { Module } = await import('@nestjs/common');
  const { ConfigModule } = await import('@nestjs/config');
  const { PrismaModule } = await import('../src/modules/prisma/prisma.module');
  const { MailModule } = await import('../src/modules/mail/mail.module');
  const { CumpleanosService } = await import('../src/modules/cumpleanos/cumpleanos.service');

  class MockCumpleModule {}
  Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, MailModule], providers: [CumpleanosService] })(MockCumpleModule);

  const contar = async () => ({
    cupones: await prisma.cupon.count({ where: { origen: 'CUMPLEANOS' } }),
    recordatorios: await prisma.cupon.count({ where: { origen: 'CUMPLEANOS', recordatorioEnviadoEn: { not: null } } }),
  });
  const antes = await contar();

  const app = await NestFactory.createApplicationContext(MockCumpleModule, { logger: ['error', 'warn'] });
  try {
    await app.get(CumpleanosService).procesarDelDia();
  } finally {
    await app.close();
  }

  const cupones = await prisma.cupon.findMany({
    where: { origen: 'CUMPLEANOS', persona: { mail: { startsWith: EMAIL_PATRON } } },
    include: { persona: { select: { nombre: true } } },
    orderBy: { idCupon: 'asc' },
  });
  console.log('Cupones de cumpleaños de prueba:');
  for (const c of cupones) {
    console.log(`  ${c.persona?.nombre.padEnd(6)} ${c.codigo.padEnd(24)} recordatorio: ${c.recordatorioEnviadoEn ? 'enviado' : '—'}`);
  }
  const despues = await contar();
  const nuevos = despues.cupones - antes.cupones;
  const recordatorios = despues.recordatorios - antes.recordatorios;
  console.log(
    nuevos || recordatorios
      ? `En esta corrida: ${nuevos} cupones nuevos y ${recordatorios} recordatorios. Los mails se ven en el panel de Resend (Emails).`
      : 'En esta corrida no correspondía mandar nada (ya estaba todo enviado). Para empezar de nuevo: npm run mock:cumple',
  );
}

async function main(): Promise<void> {
  verificarEntorno();
  const comando = process.argv[2] ?? 'crear';
  if (comando === 'crear') await crear();
  else if (comando === 'procesar') await procesar();
  else if (comando === 'limpiar') await limpiar();
  else {
    console.error('Uso: npm run mock:cumple [-- crear | procesar | limpiar]');
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
