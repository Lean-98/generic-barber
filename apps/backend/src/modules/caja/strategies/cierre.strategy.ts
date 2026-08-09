import { PrismaService } from '../../prisma/prisma.service';
import { inicioDiaAr, finDiaAr } from '../../../common/utils/fecha-ar.util';

/**
 * Interfaz del patrón Strategy para calcular totales de cierre de caja.
 * Cada forma de pago tiene una estrategia que sabe cómo sumar sus movimientos.
 */
export interface ICierreStrategy {
  nombre: string;
  calcularTotal(prisma: PrismaService, fecha: Date, idUsuario?: string): Promise<number>;
}

/**
 * Suma los INGRESO y resta los EGRESO del día para las formas de pago dadas.
 * El total de una forma de pago es lo que debería haber en esa "caja" al
 * cierre: lo que entró menos lo que salió (ej. plata retirada del cajón
 * para comprar insumos), no solo lo que entró.
 */
async function calcularNeto(prisma: PrismaService, fecha: Date, idsFormaPago: number[]): Promise<number> {
  if (idsFormaPago.length === 0) return 0;

  const inicio = inicioDiaAr(fecha);
  const fin = finDiaAr(fecha);

  const movimientos = await prisma.movimientoCaja.findMany({
    where: {
      idFormaPago: { in: idsFormaPago },
      fechaHora: { gte: inicio, lte: fin },
      tipo: { in: ['INGRESO', 'EGRESO'] },
    },
  });

  return movimientos.reduce((neto, m) => {
    const monto = Number(m.monto);
    return m.tipo === 'INGRESO' ? neto + monto : neto - monto;
  }, 0);
}

/**
 * Estrategia concreta: Efectivo
 */
export class EfectivoStrategy implements ICierreStrategy {
  nombre = 'Efectivo';

  async calcularTotal(prisma: PrismaService, fecha: Date): Promise<number> {
    const formaPago = await prisma.formaPago.findFirst({
      where: { nombre: 'Efectivo' },
    });
    if (!formaPago) return 0;

    return calcularNeto(prisma, fecha, [formaPago.idFormaPago]);
  }
}

/**
 * Estrategia concreta: Tarjeta
 * Agrupa Tarjeta de Crédito y Tarjeta de Débito
 */
export class TarjetaStrategy implements ICierreStrategy {
  nombre = 'Tarjeta';

  async calcularTotal(prisma: PrismaService, fecha: Date): Promise<number> {
    const formasPago = await prisma.formaPago.findMany({
      where: { nombre: { in: ['Tarjeta de Crédito', 'Tarjeta de Débito'] } },
    });

    return calcularNeto(prisma, fecha, formasPago.map((fp) => fp.idFormaPago));
  }
}

/**
 * Estrategia concreta: Transferencia
 */
export class TransferenciaStrategy implements ICierreStrategy {
  nombre = 'Transferencia';

  async calcularTotal(prisma: PrismaService, fecha: Date): Promise<number> {
    const formaPago = await prisma.formaPago.findFirst({
      where: { nombre: 'Transferencia' },
    });
    if (!formaPago) return 0;

    return calcularNeto(prisma, fecha, [formaPago.idFormaPago]);
  }
}

/**
 * Estrategia concreta: Otros (Mercado Pago, etc.)
 */
export class OtrosStrategy implements ICierreStrategy {
  nombre = 'Otros';

  async calcularTotal(prisma: PrismaService, fecha: Date): Promise<number> {
    const formasPago = await prisma.formaPago.findMany({
      where: {
        nombre: { notIn: ['Efectivo', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Transferencia'] },
      },
    });

    return calcularNeto(prisma, fecha, formasPago.map((fp) => fp.idFormaPago));
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
