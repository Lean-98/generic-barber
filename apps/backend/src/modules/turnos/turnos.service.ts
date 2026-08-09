import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Turno } from '@prisma/client';
import { CreateTurnoDto } from './dto/create-turno.dto';
import { UpdateTurnoDto } from './dto/update-turno.dto';
import { getTurnoState } from './estados/turno-state.factory';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';
import { horaArAUtc } from '../../common/utils/fecha-ar.util';

@Injectable()
export class TurnosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

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

    for (const servicioDto of data.servicios) {
      if (!servicios.find((s) => s.idServicio === servicioDto.idServicio)) {
        throw new BadRequestException(`Servicio ${servicioDto.idServicio} no encontrado en la lista de servicios válidos`);
      }
    }

    // 4, 5 y 6. Verificar disponibilidad y crear turno + detalles de forma atómica.
    // Sin esto, dos reservas concurrentes para el mismo horario (algo bastante
    // probable en la página pública) pueden pasar ambas la validación de
    // solapamiento antes de que la primera se confirme, y terminar dobles.
    // Serializable hace que Postgres aborte una de las dos transacciones en
    // conflicto en vez de dejarlas pasar a las dos.
    let turno: Turno & { persona: typeof persona };
    try {
      turno = await this.prisma.$transaction(
        async (tx) => {
          await this.verificarDisponibilidad(fechaHoraInicio, fechaHoraFin, undefined, tx);

          const nuevoTurno = await tx.turno.create({
            data: {
              idPersona: data.idPersona,
              fechaHoraInicio,
              fechaHoraFin,
              estado: 'PENDIENTE',
              observacion: data.observacion,
            },
            include: { persona: true },
          });

          await tx.turnoDetalle.createMany({
            data: data.servicios.map((servicioDto) => {
              const servicio = servicios.find((s) => s.idServicio === servicioDto.idServicio)!;
              return {
                idTurno: nuevoTurno.idTurno,
                idServicio: servicioDto.idServicio,
                precioReal: servicio.precio,
                cantidad: servicioDto.cantidad || 1,
              };
            }),
          });

          return nuevoTurno;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034') {
        throw new BadRequestException('Ese horario se acaba de ocupar, elegí otro horario');
      }
      throw err;
    }

    // 7. Sincronizar con Google Calendar (silencioso, no falla si no está configurado)
    try {
      const googleEventId = await this.googleCalendarService.createEvent(turno);
      if (googleEventId) {
        await this.prisma.turno.update({
          where: { idTurno: turno.idTurno },
          data: { googleEventId },
        });
      }
    } catch {
      // Silencioso: no falla si Google Calendar no está conectado
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

    const updatedTurno = await this.prisma.turno.update({
      where: { idTurno: id },
      data: {
        idPersona: data.idPersona,
        fechaHoraInicio: data.fechaHoraInicio ? new Date(data.fechaHoraInicio) : undefined,
        observacion: data.observacion,
      },
      include: { persona: true },
    });

    // Sincronizar actualización con Google Calendar
    try {
      await this.googleCalendarService.updateEvent(updatedTurno);
    } catch {
      // Silencioso
    }

    return this.findOne(id);
  }

  // Transiciones del patrón State
  async confirmar(id: number): Promise<Turno> {
    return this.cambiarEstado(id, 'CONFIRMADO', (estado) => estado.confirmar());
  }

  async cancelar(id: number): Promise<Turno> {
    const turno = await this.findOne(id);
    const estado = getTurnoState(turno.estado);
    estado.cancelar();

    // Si tiene un evento en Google Calendar, eliminarlo
    if (turno.googleEventId) {
      try {
        await this.googleCalendarService.deleteEvent(turno.googleEventId);
      } catch {
        // Silencioso
      }
    }

    return this.prisma.turno.update({
      where: { idTurno: id },
      data: { estado: 'CANCELADO', googleEventId: null },
    });
  }

  async iniciarAtencion(id: number): Promise<Turno> {
    return this.cambiarEstado(id, 'EN_PROCESO', (estado) => estado.iniciarAtencion());
  }

  async finalizar(id: number): Promise<Turno> {
    return this.cambiarEstado(id, 'COMPLETADO', (estado) => estado.finalizar());
  }

  async registrarPago(id: number): Promise<Turno> {
    return this.cambiarEstado(id, 'COMPLETADO', (estado) => estado.registrarPago());
  }

  async marcarNoShow(id: number): Promise<Turno> {
    const turno = await this.findOne(id);
    const estado = getTurnoState(turno.estado);
    estado.marcarNoShow();

    // Si tiene un evento en Google Calendar, eliminarlo
    if (turno.googleEventId) {
      try {
        await this.googleCalendarService.deleteEvent(turno.googleEventId);
      } catch {
        // Silencioso
      }
    }

    return this.prisma.turno.update({
      where: { idTurno: id },
      data: { estado: 'NO_SHOW', googleEventId: null },
    });
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

  async verificarDisponibilidad(
    fechaHoraInicio: Date,
    fechaHoraFin: Date,
    idTurno?: number,
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
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

    const solapados = await client.turno.findMany({ where });
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

  // ─── Public API: availability and client booking ───

  async getDisponibilidad(fechaStr: string, serviciosIdsStr: string): Promise<{ slots: string[]; duracionTotal: number }> {
    const serviciosIds = serviciosIdsStr.split(',').map((id) => Number(id.trim()));
    const servicios = await this.prisma.servicio.findMany({
      where: { idServicio: { in: serviciosIds }, vigente: true },
    });
    if (servicios.length !== serviciosIds.length) {
      throw new BadRequestException('Uno o más servicios no existen o no están vigentes');
    }
    const duracionTotal = servicios.reduce((total, s) => total + s.duracionMinutos, 0);

    const fecha = new Date(fechaStr);
    const inicioJornada = horaArAUtc(fecha, 9);
    const finJornada = horaArAUtc(fecha, 18);

    // Obtener turnos ocupados del día
    const turnosOcupados = await this.prisma.turno.findMany({
      where: {
        fechaHoraInicio: { gte: inicioJornada, lt: finJornada },
        estado: { notIn: ['CANCELADO', 'NO_SHOW'] },
      },
    });

    const slots: string[] = [];
    const intervalo = 30; // minutos
    for (let minutos = 0; minutos < 540; minutos += intervalo) {
      const slotInicio = new Date(inicioJornada.getTime() + minutos * 60000);
      const slotFin = new Date(slotInicio.getTime() + duracionTotal * 60000);

      if (slotFin > finJornada) break;

      // Verificar si el slot está libre
      const ocupado = turnosOcupados.some((t) => {
        const tInicio = new Date(t.fechaHoraInicio);
        const tFin = new Date(t.fechaHoraFin);
        return (
          (slotInicio >= tInicio && slotInicio < tFin) ||
          (slotFin > tInicio && slotFin <= tFin) ||
          (slotInicio <= tInicio && slotFin >= tFin)
        );
      });

      if (!ocupado) {
        slots.push(slotInicio.toISOString());
      }
    }

    return { slots, duracionTotal };
  }

  async reservarPublica(data: { nombre: string; apellido: string; email: string; telefono?: string; fechaHoraInicio: string; observacion?: string; servicios: { idServicio: number; cantidad?: number }[] }): Promise<Turno> {
    // 1. Buscar o crear persona por email
    let persona = await this.prisma.persona.findUnique({
      where: { mail: data.email },
    });

    if (!persona) {
      persona = await this.prisma.persona.create({
        data: {
          nombre: data.nombre,
          apellido: data.apellido,
          mail: data.email,
          telefono: data.telefono,
        },
      });
    }

    // 2. Crear turno usando el método existente
    const createDto = {
      idPersona: persona.idPersona,
      fechaHoraInicio: data.fechaHoraInicio,
      observacion: data.observacion,
      servicios: data.servicios,
    };

    return this.create(createDto);
  }
}
