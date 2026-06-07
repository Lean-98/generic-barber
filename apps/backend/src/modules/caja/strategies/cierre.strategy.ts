import { PrismaService } from '../../prisma/prisma.service';

/**
 * Interfaz del patrón Strategy para calcular totales de cierre de caja.
 * Cada forma de pago tiene una estrategia que sabe cómo sumar sus movimientos.
 */
export interface ICierreStrategy {
  nombre: string;
  calcularTotal(prisma: PrismaService, fecha: Date, idUsuario?: string): Promise<number>;
}

/**
 * Estrategia concreta: Efectivo
 */
export class EfectivoStrategy implements ICierreStrategy {
  nombre = 'Efectivo';

  async calcularTotal(prisma: PrismaService, fecha: Date): Promise<number> {
    const inicio = new Date(fecha);
    inicio.setUTCHours(0, 0, 0, 0);
    const fin = new Date(fecha);
    fin.setUTCHours(23, 59, 59, 999);

    const formaPago = await prisma.formaPago.findFirst({
      where: { nombre: 'Efectivo' },
    });

    if (!formaPago) return 0;

    const movimientos = await prisma.movimientoCaja.findMany({
      where: {
        idFormaPago: formaPago.idFormaPago,
        fechaHora: { gte: inicio, lte: fin },
        tipo: 'INGRESO',
      },
    });

    return movimientos.reduce((sum, m) => sum + Number(m.monto), 0);
  }
}

/**
 * Estrategia concreta: Tarjeta
 * Agrupa Tarjeta de Crédito y Tarjeta de Débito
 */
export class TarjetaStrategy implements ICierreStrategy {
  nombre = 'Tarjeta';

  async calcularTotal(prisma: PrismaService, fecha: Date): Promise<number> {
    const inicio = new Date(fecha);
    inicio.setUTCHours(0, 0, 0, 0);
    const fin = new Date(fecha);
    fin.setUTCHours(23, 59, 59, 999);

    const formasPago = await prisma.formaPago.findMany({
      where: {
        nombre: { in: ['Tarjeta de Crédito', 'Tarjeta de Débito'] },
      },
    });

    if (formasPago.length === 0) return 0;

    const ids = formasPago.map((fp) => fp.idFormaPago);

    const movimientos = await prisma.movimientoCaja.findMany({
      where: {
        idFormaPago: { in: ids },
        fechaHora: { gte: inicio, lte: fin },
        tipo: 'INGRESO',
      },
    });

    return movimientos.reduce((sum, m) => sum + Number(m.monto), 0);
  }
}

/**
 * Estrategia concreta: Transferencia
 */
export class TransferenciaStrategy implements ICierreStrategy {
  nombre = 'Transferencia';

  async calcularTotal(prisma: PrismaService, fecha: Date): Promise<number> {
    const inicio = new Date(fecha);
    inicio.setUTCHours(0, 0, 0, 0);
    const fin = new Date(fecha);
    fin.setUTCHours(23, 59, 59, 999);

    const formaPago = await prisma.formaPago.findFirst({
      where: { nombre: 'Transferencia' },
    });

    if (!formaPago) return 0;

    const movimientos = await prisma.movimientoCaja.findMany({
      where: {
        idFormaPago: formaPago.idFormaPago,
        fechaHora: { gte: inicio, lte: fin },
        tipo: 'INGRESO',
      },
    });

    return movimientos.reduce((sum, m) => sum + Number(m.monto), 0);
  }
}

/**
 * Estrategia concreta: Otros (Mercado Pago, etc.)
 */
export class OtrosStrategy implements ICierreStrategy {
  nombre = 'Otros';

  async calcularTotal(prisma: PrismaService, fecha: Date): Promise<number> {
    const inicio = new Date(fecha);
    inicio.setUTCHours(0, 0, 0, 0);
    const fin = new Date(fecha);
    fin.setUTCHours(23, 59, 59, 999);

    const formasPago = await prisma.formaPago.findMany({
      where: {
        nombre: { notIn: ['Efectivo', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Transferencia'] },
      },
    });

    if (formasPago.length === 0) return 0;

    const ids = formasPago.map((fp) => fp.idFormaPago);

    const movimientos = await prisma.movimientoCaja.findMany({
      where: {
        idFormaPago: { in: ids },
        fechaHora: { gte: inicio, lte: fin },
        tipo: 'INGRESO',
      },
    });

    return movimientos.reduce((sum, m) => sum + Number(m.monto), 0);
  }
}

/**
 * Factory para obtener la estrategia correcta.
 * Permite agregar nuevas formas de pago sin modificar el código del cierre.
 */
export function getCierreStrategy(nombre: string): ICierreStrategy {
  switch (nombre) {
    case 'Efectivo':
      return new EfectivoStrategy();
    case 'Tarjeta':
      return new TarjetaStrategy();
    case 'Transferencia':
      return new TransferenciaStrategy();
    case 'Otros':
      return new OtrosStrategy();
    default:
      return new OtrosStrategy();
  }
}
