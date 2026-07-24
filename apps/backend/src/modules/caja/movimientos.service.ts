import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MovimientoCaja } from '@prisma/client';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';

@Injectable()
export class MovimientosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateMovimientoDto): Promise<MovimientoCaja> {
    return this.prisma.movimientoCaja.create({
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
    const inicio = new Date(fecha);
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date(fecha);
    fin.setHours(23, 59, 59, 999);

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
    const inicio = new Date(fecha);
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date(fecha);
    fin.setHours(23, 59, 59, 999);

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
    const inicio = new Date(fecha);
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date(fecha);
    fin.setHours(23, 59, 59, 999);

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
