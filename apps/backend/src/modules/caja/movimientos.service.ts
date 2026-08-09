import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MovimientoCaja, Prisma } from '@prisma/client';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import { inicioDiaAr, finDiaAr } from '../../common/utils/fecha-ar.util';

@Injectable()
export class MovimientosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateMovimientoDto,
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ): Promise<MovimientoCaja> {
    return client.movimientoCaja.create({
      data: {
        fechaHora: new Date(),
        tipo: data.tipo,
        monto: data.monto,
        concepto: data.concepto,
        idFormaPago: data.idFormaPago,
        idUsuario: data.idUsuario!,
        idTurno: data.idTurno || null,
      },
    });
  }

  async findByFecha(fecha: Date): Promise<MovimientoCaja[]> {
    const inicio = inicioDiaAr(fecha);
    const fin = finDiaAr(fecha);

    return this.prisma.movimientoCaja.findMany({
      where: {
        fechaHora: { gte: inicio, lte: fin },
      },
      include: { formaPago: true },
      orderBy: { fechaHora: 'asc' },
    });
  }

  async findFormasPago(): Promise<{ idFormaPago: number; nombre: string; requiereComprobante: boolean }[]> {
    return this.prisma.formaPago.findMany({
      where: { vigente: true },
      orderBy: { idFormaPago: 'asc' },
    });
  }

  async findByUsuario(idUsuario: string): Promise<MovimientoCaja[]> {
    return this.prisma.movimientoCaja.findMany({
      where: { idUsuario },
      include: { formaPago: true },
      orderBy: { fechaHora: 'desc' },
    });
  }

  async calcularTotalIngresos(fecha: Date): Promise<number> {
    const inicio = inicioDiaAr(fecha);
    const fin = finDiaAr(fecha);

    const result = await this.prisma.movimientoCaja.aggregate({
      where: {
        tipo: 'INGRESO',
        fechaHora: { gte: inicio, lte: fin },
      },
      _sum: { monto: true },
    });

    return Number(result._sum.monto || 0);
  }

  async calcularTotalEgresos(fecha: Date): Promise<number> {
    const inicio = inicioDiaAr(fecha);
    const fin = finDiaAr(fecha);

    const result = await this.prisma.movimientoCaja.aggregate({
      where: {
        tipo: 'EGRESO',
        fechaHora: { gte: inicio, lte: fin },
      },
      _sum: { monto: true },
    });

    return Number(result._sum.monto || 0);
  }
}
