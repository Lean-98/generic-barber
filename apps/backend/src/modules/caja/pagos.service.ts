import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePagoDto } from './dto/create-pago.dto';
import { Pago, Prisma } from '@prisma/client';

@Injectable()
export class PagosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePagoDto, client: PrismaService | Prisma.TransactionClient = this.prisma): Promise<Pago> {
    return client.pago.create({
      data: {
        idTurno: data.idTurno,
        idFormaPago: data.idFormaPago,
        monto: data.monto,
        comprobante: data.comprobante,
      },
    });
  }

  async findByTurno(idTurno: number): Promise<Pago[]> {
    return this.prisma.pago.findMany({
      where: { idTurno },
      include: { formaPago: true },
    });
  }

  async findOne(id: number): Promise<Pago | null> {
    return this.prisma.pago.findUnique({
      where: { idPago: id },
      include: { formaPago: true, turno: true },
    });
  }

  async calcularTotalPagado(idTurno: number): Promise<number> {
    const result = await this.prisma.pago.aggregate({
      where: { idTurno },
      _sum: { monto: true },
    });
    return Number(result._sum.monto || 0);
  }
}
