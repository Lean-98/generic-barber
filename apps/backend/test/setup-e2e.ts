import { PrismaService } from '../src/modules/prisma/prisma.service';

/**
 * Setup global para tests e2e.
 * Se ejecuta antes de cada test suite.
 * Asegura que la conexión a Prisma esté lista.
 */

// Extender jest timeout para tests e2e que levantan la app
jest.setTimeout(30000);

// Helper: Limpiar tablas completas para mantener tests idempotentes
export async function cleanDatabase(prisma: PrismaService) {
  // Orden importa por foreign keys: borrar primero los que tienen FK, luego los referenciados
  await prisma.cierreCaja.deleteMany();
  await prisma.movimientoCaja.deleteMany();
  await prisma.pago.deleteMany();
  await prisma.turnoDetalle.deleteMany();
  await prisma.turno.deleteMany();
  await prisma.usuarioWeb.deleteMany(); // tiene FK a persona, borrar antes
  await prisma.persona.deleteMany();    // referenciado por usuarioWeb
  await prisma.formaPago.deleteMany();
  await prisma.servicio.deleteMany();
}
