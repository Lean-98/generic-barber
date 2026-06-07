import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Turno } from '@prisma/client';
import { CreateTurnoDto } from './dto/create-turno.dto';
import { UpdateTurnoDto } from './dto/update-turno.dto';
import { getTurnoState } from './estados/turno-state.factory';

@Injectable()
export class TurnosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateTurnoDto): Promise<Turno> {
    // 1. Validar que la persona existe
    const persona = await this.prisma.persona.findUnique({
      where: { idPersona: data.idPersona },
    });
    if (!persona) {
      throw new NotFoundException(`Persona con id ${data.idPersona} no encontrada`);
    }

    // 2. Validar que los servicios existen y están vigentes
    const serviciosIds = data.servicios.map((s) => s.idServicio);
    const servicios = await this.prisma.servicio.findMany({
      where: { idServicio: { in: serviciosIds }, vigente: true },
    });
    if (servicios.length !== serviciosIds.length) {
      throw new BadRequestException('Uno o más servicios no existen o no están vigentes');
    }

    // 3. Calcular duración total
    const duracionTotal = servicios.reduce((total, servicio) => {
      const cantidad =
        data.servicios.find((s) => s.idServicio === servicio.idServicio)?.cantidad || 1;
      return total + servicio.duracionMinutos * cantidad;
    }, 0);

    const fechaHoraInicio = new Date(data.fechaHoraInicio);
    const fechaHoraFin = new Date(fechaHoraInicio.getTime() + duracionTotal * 60000);

    // 4. Verificar disponibilidad (no solaparse con turnos existentes)
    await this.verificarDisponibilidad(fechaHoraInicio, fechaHoraFin);

    // 5. Crear turno con estado PENDIENTE
    const turno = await this.prisma.turno.create({
      data: {
        idPersona: data.idPersona,
        fechaHoraInicio,
        fechaHoraFin,
        estado: 'PENDIENTE',
        observacion: data.observacion,
      },
    });

    // 6. Crear detalles del turno
    for (const servicioDto of data.servicios) {
      const servicio = servicios.find((s) => s.idServicio === servicioDto.idServicio);
      if (!servicio) {
        throw new BadRequestException(`Servicio ${servicioDto.idServicio} no encontrado en la lista de servicios válidos`);
      }
      await this.prisma.turnoDetalle.create({
        data: {
          idTurno: turno.idTurno,
          idServicio: servicioDto.idServicio,
          precioReal: servicio.precio,
          cantidad: servicioDto.cantidad || 1,
        },
      });
    }

    return this.findOne(turno.idTurno);
  }

  async findAll(fechaDesde?: string, fechaHasta?: string): Promise<Turno[]> {
    const where: any = {};
    if (fechaDesde || fechaHasta) {
      where.fechaHoraInicio = {};
      if (fechaDesde) where.fechaHoraInicio.gte = new Date(fechaDesde);
      if (fechaHasta) where.fechaHoraInicio.lte = new Date(fechaHasta);
    }

    return this.prisma.turno.findMany({
      where,
      orderBy: { fechaHoraInicio: 'asc' },
      include: {
        persona: true,
        detalles: {
          include: {
            servicio: true,
          },
        },
      },
    });
  }

  async findOne(id: number): Promise<Turno & { detalles: any[]; persona: any }> {
    const turno = await this.prisma.turno.findUnique({
      where: { idTurno: id },
      include: {
        persona: true,
        detalles: {
          include: {
            servicio: true,
          },
        },
        pagos: true,
      },
    });

    if (!turno) {
      throw new NotFoundException(`Turno con id ${id} no encontrado`);
    }

    return turno;
  }

  async update(id: number, data: UpdateTurnoDto): Promise<Turno> {
    const turno = await this.findOne(id);
    const estado = getTurnoState(turno.estado);

    // Solo se puede editar si está PENDIENTE o CONFIRMADO
    if (turno.estado !== 'PENDIENTE' && turno.estado !== 'CONFIRMADO') {
      throw new BadRequestException(
        `No se puede editar: el turno está ${turno.estado}`,
      );
    }

    return this.prisma.turno.update({
      where: { idTurno: id },
      data: {
        idPersona: data.idPersona,
        fechaHoraInicio: data.fechaHoraInicio ? new Date(data.fechaHoraInicio) : undefined,
        observacion: data.observacion,
      },
    });
  }

  // Transiciones del patrón State
  async confirmar(id: number): Promise<Turno> {
    return this.cambiarEstado(id, 'CONFIRMADO', (estado) => estado.confirmar());
  }

  async cancelar(id: number): Promise<Turno> {
    return this.cambiarEstado(id, 'CANCELADO', (estado) => estado.cancelar());
  }

  async iniciarAtencion(id: number): Promise<Turno> {
    return this.cambiarEstado(id, 'EN_ATENCION', (estado) => estado.iniciarAtencion());
  }

  async finalizar(id: number): Promise<Turno> {
    return this.cambiarEstado(id, 'FINALIZADO', (estado) => estado.finalizar());
  }

  async registrarPago(id: number): Promise<Turno> {
    return this.cambiarEstado(id, 'PAGADO', (estado) => estado.registrarPago());
  }

  async marcarNoShow(id: number): Promise<Turno> {
    return this.cambiarEstado(id, 'NO_SHOW', (estado) => estado.marcarNoShow());
  }

  private async cambiarEstado(
    id: number,
    nuevoEstado: string,
    validacion: (estado: any) => void,
  ): Promise<Turno> {
    const turno = await this.findOne(id);
    const estado = getTurnoState(turno.estado);
    validacion(estado);

    return this.prisma.turno.update({
      where: { idTurno: id },
      data: { estado: nuevoEstado },
    });
  }

  async verificarDisponibilidad(fechaHoraInicio: Date, fechaHoraFin: Date, idTurno?: number): Promise<void> {
    const where: any = {
      AND: [
        { estado: { not: 'CANCELADO' } },
        { estado: { not: 'NO_SHOW' } },
        {
          OR: [
            {
              fechaHoraInicio: { lte: fechaHoraInicio },
              fechaHoraFin: { gt: fechaHoraInicio },
            },
            {
              fechaHoraInicio: { lt: fechaHoraFin },
              fechaHoraFin: { gte: fechaHoraFin },
            },
            {
              fechaHoraInicio: { gte: fechaHoraInicio },
              fechaHoraFin: { lte: fechaHoraFin },
            },
          ],
        },
      ],
    };

    if (idTurno) {
      where.idTurno = { not: idTurno };
    }

    const solapados = await this.prisma.turno.findMany({ where });
    if (solapados.length > 0) {
      throw new BadRequestException(
        `Ya existe un turno en ese horario (${solapados[0].fechaHoraInicio.toISOString()} - ${solapados[0].fechaHoraFin.toISOString()})`,
      );
    }
  }

  async calcularTotal(id: number): Promise<number> {
    const turno = await this.findOne(id);
    return turno.detalles.reduce((total, detalle) => {
      return total + Number(detalle.precioReal) * detalle.cantidad;
    }, 0);
  }
}
