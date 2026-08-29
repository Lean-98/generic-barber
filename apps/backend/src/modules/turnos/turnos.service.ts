import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Turno } from '@prisma/client';
import { CreateTurnoDto } from './dto/create-turno.dto';
import { UpdateTurnoDto } from './dto/update-turno.dto';
import { getTurnoState } from './estados/turno-state.factory';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';
import { horaArAUtc, inicioDiaAr, finDiaAr } from '../../common/utils/fecha-ar.util';
import { PaginatedResult, paginar } from '../../common/interfaces/paginated-result.interface';

interface HorarioDiaConfig {
  dia: number;
  cerrado: boolean;
  abre?: string;
  cierra?: string;
  abre2?: string;
  cierra2?: string;
}

const CONFIG_ID = 1;
const DESCUENTO_MOTIVO_FIDELIZACION = 'FIDELIZACION';
const DESCUENTO_MOTIVO_EMPLEADO = 'EMPLEADO';

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

    // 2.b. Descuento de personal: opcional, solo si el cliente está marcado
    // como empleado y el descuento está activo en la configuración.
    let descuentoEmpleadoPorcentaje = 0;
    if (data.aplicarDescuentoEmpleado) {
      if (!persona.aplicaDescuentoPersonal) {
        throw new BadRequestException('El descuento de personal solo puede aplicarse a una persona marcada como empleado');
      }
      const config = await this.prisma.configuracionNegocio.findUnique({ where: { id: CONFIG_ID } });
      if (!config?.descuentoEmpleadoActivo || config.descuentoEmpleadoPorcentaje == null) {
        throw new BadRequestException('El descuento de personal no está activo');
      }
      descuentoEmpleadoPorcentaje = Number(config.descuentoEmpleadoPorcentaje);
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
                descuentoPorcentaje: descuentoEmpleadoPorcentaje,
                descuentoMotivo: descuentoEmpleadoPorcentaje > 0 ? DESCUENTO_MOTIVO_EMPLEADO : null,
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

  async findAll(fechaDesde?: string, fechaHasta?: string, page = 1, limit = 20): Promise<PaginatedResult<Turno>> {
    const where: Prisma.TurnoWhereInput = {};
    if (fechaDesde || fechaHasta) {
      where.fechaHoraInicio = {};
      if (fechaDesde) where.fechaHoraInicio.gte = new Date(fechaDesde);
      if (fechaHasta) where.fechaHoraInicio.lte = new Date(fechaHasta);
    }

    const [data, total] = await Promise.all([
      this.prisma.turno.findMany({
        where,
        orderBy: { fechaHoraInicio: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          persona: true,
          detalles: {
            include: {
              servicio: true,
            },
          },
        },
      }),
      this.prisma.turno.count({ where }),
    ]);
    return paginar(data, total, page, limit);
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

    if (nuevoEstado === 'COMPLETADO') {
      await this.aplicarDescuentoFidelizacion(turno);
    }

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
    return turno.detalles.reduce((total, detalle: any) => {
      const descuento = Number(detalle.descuentoPorcentaje ?? 0);
      return total + Number(detalle.precioReal) * detalle.cantidad * (1 - descuento / 100);
    }, 0);
  }

  /**
   * Programa de fidelización: cada N visitas completadas de un servicio marcado
   * como "cuenta para fidelización", la visita número N (2N, 3N, ...) se descuenta
   * automáticamente. Genérico: N, el % y si está activo son configurables, y no
   * cuenta a personas marcadas como empleado (esas usan el descuento de personal).
   * Se corre al entrar a COMPLETADO; el filtro por descuentoPorcentaje === 0 lo
   * hace idempotente ante llamados repetidos (ej. varios pagos parciales).
   */
  private async aplicarDescuentoFidelizacion(turno: Turno & { idPersona: number; persona: { aplicaDescuentoPersonal: boolean }; detalles: any[] }): Promise<void> {
    const config = await this.prisma.configuracionNegocio.findUnique({ where: { id: CONFIG_ID } });
    if (!config?.fidelizacionActiva || !config.fidelizacionVisitasRequeridas || config.fidelizacionDescuentoPorcentaje == null) {
      return;
    }

    if (turno.persona.aplicaDescuentoPersonal) return;

    const detallesQueCuentan = turno.detalles
      .filter((d: any) => d.servicio?.cuentaParaFidelizacion && Number(d.descuentoPorcentaje) === 0)
      .sort((a: any, b: any) => a.idTurnoDetalle - b.idTurnoDetalle);
    if (detallesQueCuentan.length === 0) return;

    const visitasPrevias = await this.prisma.turnoDetalle.count({
      where: {
        servicio: { cuentaParaFidelizacion: true },
        turno: {
          idPersona: turno.idPersona,
          estado: 'COMPLETADO',
          ...(config.fidelizacionFechaInicio ? { fechaHoraInicio: { gte: config.fidelizacionFechaInicio } } : {}),
        },
      },
    });

    const visitasRequeridas = config.fidelizacionVisitasRequeridas;
    const descuentoPorcentaje = Number(config.fidelizacionDescuentoPorcentaje);

    for (let i = 0; i < detallesQueCuentan.length; i++) {
      const numeroVisita = visitasPrevias + i + 1;
      if (numeroVisita % visitasRequeridas === 0) {
        await this.prisma.turnoDetalle.update({
          where: { idTurnoDetalle: detallesQueCuentan[i].idTurnoDetalle },
          data: { descuentoPorcentaje, descuentoMotivo: DESCUENTO_MOTIVO_FIDELIZACION },
        });
      }
    }
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

    // El día de la semana y los horarios de atención salen de la configuración
    // real del negocio (incluye horario partido: dos franjas por día), no de
    // un bloque fijo — un día "cerrado" o con horario distinto debe respetarse.
    const config = await this.prisma.configuracionNegocio.findUnique({ where: { id: CONFIG_ID } });
    const horarios = (config?.horarios as unknown as HorarioDiaConfig[] | null) ?? [];
    const diaSemana = fecha.getUTCDay();
    const horarioDia = horarios.find((h) => h.dia === diaSemana);

    if (!horarioDia || horarioDia.cerrado) {
      return { slots: [], duracionTotal };
    }

    const franjas: { abre: string; cierra: string }[] = [];
    if (horarioDia.abre && horarioDia.cierra) franjas.push({ abre: horarioDia.abre, cierra: horarioDia.cierra });
    if (horarioDia.abre2 && horarioDia.cierra2) franjas.push({ abre: horarioDia.abre2, cierra: horarioDia.cierra2 });
    if (franjas.length === 0) {
      return { slots: [], duracionTotal };
    }

    // Obtener turnos ocupados de todo el día (cubre ambas franjas del horario partido)
    const turnosOcupados = await this.prisma.turno.findMany({
      where: {
        fechaHoraInicio: { gte: inicioDiaAr(fecha), lt: finDiaAr(fecha) },
        estado: { notIn: ['CANCELADO', 'NO_SHOW'] },
      },
    });

    const slots: string[] = [];
    const intervalo = 30; // minutos
    for (const franja of franjas) {
      const [horaAbre, minAbre] = franja.abre.split(':').map(Number);
      const [horaCierra, minCierra] = franja.cierra.split(':').map(Number);
      const inicioFranja = horaArAUtc(fecha, horaAbre, minAbre);
      const finFranja = horaArAUtc(fecha, horaCierra, minCierra);

      for (let t = inicioFranja.getTime(); ; t += intervalo * 60000) {
        const slotInicio = new Date(t);
        const slotFin = new Date(slotInicio.getTime() + duracionTotal * 60000);

        if (slotFin > finFranja) break;

        const ocupado = turnosOcupados.some((turno) => {
          const tInicio = new Date(turno.fechaHoraInicio);
          const tFin = new Date(turno.fechaHoraFin);
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
    }

    return { slots, duracionTotal };
  }

  /** Para el paso "Tus datos" del turnero público: si el email ya es de un cliente, el frontend se salta el formulario de nombre/apellido/teléfono. */
  async buscarClientePorEmail(email: string): Promise<{ existe: boolean; nombre?: string }> {
    const persona = await this.prisma.persona.findUnique({ where: { mail: email }, select: { nombre: true } });
    return persona ? { existe: true, nombre: persona.nombre } : { existe: false };
  }

  async reservarPublica(data: { nombre?: string; apellido?: string; email: string; telefono?: string; fechaHoraInicio: string; observacion?: string; servicios: { idServicio: number; cantidad?: number }[] }): Promise<Turno> {
    // 1. Buscar o crear persona por email
    let persona = await this.prisma.persona.findUnique({
      where: { mail: data.email },
    });

    if (!persona) {
      // Cliente nuevo: acá sí hacen falta nombre y apellido (el frontend solo
      // los pide cuando buscarClientePorEmail no encontró a nadie con ese mail).
      if (!data.nombre || !data.apellido) {
        throw new BadRequestException('nombre y apellido son requeridos para un cliente nuevo');
      }
      persona = await this.prisma.persona.create({
        data: {
          nombre: data.nombre,
          apellido: data.apellido,
          mail: data.email,
          telefono: data.telefono,
        },
      });
    }

    // 2. Descuento de personal: acá no hay checkbox que tildar (es autogestionado
    // y público), así que si la persona ya está marcada para el descuento y el
    // descuento está activo, se aplica solo. Verificamos el estado del
    // descuento nosotros mismos antes de pedirlo, para que reservar nunca
    // falle por esto — si no está activo, simplemente no se aplica.
    let aplicarDescuentoEmpleado = false;
    if (persona.aplicaDescuentoPersonal) {
      const config = await this.prisma.configuracionNegocio.findUnique({ where: { id: CONFIG_ID } });
      aplicarDescuentoEmpleado = !!config?.descuentoEmpleadoActivo && config.descuentoEmpleadoPorcentaje != null;
    }

    // 3. Crear turno usando el método existente
    const createDto = {
      idPersona: persona.idPersona,
      fechaHoraInicio: data.fechaHoraInicio,
      observacion: data.observacion,
      servicios: data.servicios,
      aplicarDescuentoEmpleado,
    };

    return this.create(createDto);
  }
}
