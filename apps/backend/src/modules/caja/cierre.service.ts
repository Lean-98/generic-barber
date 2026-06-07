import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CierreCaja } from '@prisma/client';
import { ICierreStrategy, getCierreStrategy } from './strategies/cierre.strategy';

@Injectable()
export class CierreService {
  constructor(private readonly prisma: PrismaService) {}

  async iniciarCierre(fecha: Date, idUsuario: string): Promise<CierreCaja> {
    // Verificar si ya existe un cierre para esta fecha
    const existing = await this.prisma.cierreCaja.findFirst({
      where: { fecha: new Date(fecha) },
    });

    if (existing) {
      throw new BadRequestException('Ya existe un cierre para esta fecha');
    }

    const inicio = new Date(fecha);
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date(fecha);
    fin.setHours(23, 59, 59, 999);

    // Calcular totales esperados usando Strategy
    const efectivo = getCierreStrategy('Efectivo');
    const tarjeta = getCierreStrategy('Tarjeta');
    const transferencia = getCierreStrategy('Transferencia');
    const otros = getCierreStrategy('Otros');

    const [totalEfectivo, totalTarjeta, totalTransferencia, totalOtros] = await Promise.all([
      efectivo.calcularTotal(this.prisma, fecha),
      tarjeta.calcularTotal(this.prisma, fecha),
      transferencia.calcularTotal(this.prisma, fecha),
      otros.calcularTotal(this.prisma, fecha),
    ]);

    const totalEsperado = totalEfectivo + totalTarjeta + totalTransferencia + totalOtros;

    return this.prisma.cierreCaja.create({
      data: {
        fecha: new Date(fecha),
        horaInicio: new Date(),
        totalEfectivo,
        totalTarjeta,
        totalTransferencia,
        totalOtros,
        totalEsperado,
        totalReal: 0,
        diferencia: 0,
        idUsuarioCierra: idUsuario,
      },
    });
  }

  async confirmarCierre(
    id: number,
    totalReal: number,
    idUsuario: string,
  ): Promise<CierreCaja> {
    const cierre = await this.prisma.cierreCaja.findUnique({
      where: { idCierre: id },
    });

    if (!cierre) {
      throw new NotFoundException('Cierre no encontrado');
    }

    if (cierre.horaFin) {
      throw new BadRequestException('El cierre ya fue confirmado');
    }

    const diferencia = totalReal - Number(cierre.totalEsperado);

    return this.prisma.cierreCaja.update({
      where: { idCierre: id },
      data: {
        horaFin: new Date(),
        totalReal,
        diferencia,
        idUsuarioCierra: idUsuario,
      },
    });
  }

  async findByFecha(fecha: Date): Promise<CierreCaja> {
    const cierre = await this.prisma.cierreCaja.findFirst({
      where: { fecha: new Date(fecha) },
      include: { usuarioCierra: { include: { persona: true } } },
    });

    if (!cierre) {
      throw new NotFoundException('No hay cierre para esta fecha');
    }

    return cierre;
  }

  async findAll(): Promise<CierreCaja[]> {
    return this.prisma.cierreCaja.findMany({
      orderBy: { fecha: 'desc' },
      include: { usuarioCierra: { include: { persona: true } } },
    });
  }
}
