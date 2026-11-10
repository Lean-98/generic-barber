import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Cupon, Pago, Prisma, Turno } from '@prisma/client';
import { CreateTurnoDto } from './dto/create-turno.dto';
import { UpdateTurnoDto } from './dto/update-turno.dto';
import { getTurnoState } from './estados/turno-state.factory';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';
import { MailService } from '../mail/mail.service';
import { horaArAUtc, inicioDiaAr, finDiaAr, diaCalendarioAr } from '../../common/utils/fecha-ar.util';
import { PaginatedResult, paginar } from '../../common/interfaces/paginated-result.interface';
import { urlCancelacion, verificarTokenCancelacion } from './cancelacion-token.util';
import { CuponesService } from '../cupones/cupones.service';
import { contarVisitasCompletadas, progresoDeCliente, progresoDeTurno, ProgresoCliente } from './fidelizacion.util';

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
const DESCUENTO_MOTIVO_CUPON = 'CUPON';
/** Estados desde los que el cliente todavía puede cancelar con el link del mail. */
const ESTADOS_CANCELABLES_POR_CLIENTE = ['PENDIENTE', 'CONFIRMADO'];
/**
 * Anticipación mínima para reservar online si el negocio no la configuró
 * (configuracion_negocio.reserva_anticipacion_minutos). Solo aplica a la
 * reserva pública; desde el panel se puede cargar un turno pasado (ej. un
 * cliente que vino sin turno).
 */
const ANTICIPACION_RESERVA_DEFECTO_MIN = 15;

export type OrigenCancelacion = 'CLIENTE' | 'PANEL';

/** Lo que ve el cliente en la página pública de cancelación (nada de datos sensibles). */
export interface TurnoParaCancelar {
  nombreCliente: string;
  fechaHoraInicio: Date;
  servicios: string[];
  estado: string;
  puedeCancelar: boolean;
}

@Injectable()
export class TurnosService {
  private readonly logger = new Logger(TurnosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly cuponesService: CuponesService,
  ) {}

  /**
   * opciones.cupon: solo desde la reserva online (ya validado en vigencia).
   * No se acumula con el descuento de personal: se aplica el mayor.
   */
  async create(
    data: CreateTurnoDto,
    opciones: { cupon?: Cupon } = {},
  ): Promise<Turno & { detalles: any[]; persona: any; pagos: Pago[] }> {
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

    // 2.c. Forma de pago preferida: opcional (el alta manual del dueño no la pide),
    // pero si viene tiene que ser una forma de pago real y vigente.
    if (data.idFormaPagoPreferida != null) {
      const formaPago = await this.prisma.formaPago.findUnique({
        where: { idFormaPago: data.idFormaPagoPreferida },
      });
      if (!formaPago || !formaPago.vigente) {
        throw new BadRequestException('La forma de pago preferida no existe o no está vigente');
      }
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

    // 2.d. Cupón: si es mayor que el descuento de personal, reemplaza a ese.
    const cuponPorcentaje = opciones.cupon ? Number(opciones.cupon.descuentoPorcentaje) : 0;
    const usaCupon = !!opciones.cupon && cuponPorcentaje > descuentoEmpleadoPorcentaje;
    const descuentoPorcentaje = usaCupon ? cuponPorcentaje : descuentoEmpleadoPorcentaje;
    const descuentoMotivo = usaCupon ? DESCUENTO_MOTIVO_CUPON : descuentoEmpleadoPorcentaje > 0 ? DESCUENTO_MOTIVO_EMPLEADO : null;

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

    // 3.c. El turno tiene que entrar dentro del horario de atención real del
    // negocio (día no cerrado, y dentro de alguna de sus franjas). Antes esto
    // solo se usaba para sugerir slots en getDisponibilidad(); un turno podía
    // crearse igual en un día cerrado o en el hueco entre franjas.
    await this.verificarHorarioAtencion(fechaHoraInicio, fechaHoraFin);

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
          // Adentro de la transacción: dos reservas a la vez no se llevan el último lugar del cupo.
          if (usaCupon) await this.cuponesService.verificarUsos(tx, opciones.cupon!, { idPersona: data.idPersona });

          const nuevoTurno = await tx.turno.create({
            data: {
              idPersona: data.idPersona,
              fechaHoraInicio,
              fechaHoraFin,
              // Nace directo CONFIRMADO: el chequeo de disponibilidad de más
              // arriba ya garantiza atómicamente que el horario no se pisa con
              // otro turno, así que el paso PENDIENTE no agregaba ninguna
              // protección real — solo un toque manual de más (ver
              // TurnosCronService para el resto de las transiciones automáticas).
              estado: 'CONFIRMADO',
              observacion: data.observacion,
              idFormaPagoPreferida: data.idFormaPagoPreferida,
              idCupon: usaCupon ? opciones.cupon!.idCupon : null,
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
                descuentoPorcentaje,
                descuentoMotivo,
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

    // 8. Mandar email de confirmación (silencioso, no debe romper la creación del turno)
    if (turno.persona.mail) {
      try {
        const config = await this.prisma.configuracionNegocio.findUnique({ where: { id: CONFIG_ID } });
        const fidelizacion = await progresoDeTurno(this.prisma, config, {
          idTurno: turno.idTurno,
          idPersona: turno.idPersona,
          fechaHoraInicio: turno.fechaHoraInicio,
          aplicaDescuentoPersonal: persona.aplicaDescuentoPersonal,
          serviciosQueSuman: data.servicios.filter((s) => servicios.find((x) => x.idServicio === s.idServicio)?.cuentaParaFidelizacion).length,
        });
        await this.mailService.sendTurnoConfirmacion(turno.persona.mail, {
          nombreCliente: turno.persona.nombre,
          fechaHoraInicio: turno.fechaHoraInicio,
          servicios: servicios.map((s) => s.nombre),
          direccion: config?.direccion,
          whatsappUrl: config?.whatsappUrl,
          politicaReservas: config?.politicaReservas,
          nombreNegocio: config?.nombre,
          logoUrl: config?.logoUrl,
          colorPrimario: config?.colorPrimario,
          cancelarUrl: this.urlCancelacionDe(turno.idTurno),
          fidelizacion,
          cupon: usaCupon ? { codigo: opciones.cupon!.codigo, descuentoPorcentaje: cuponPorcentaje } : null,
        });
      } catch {
        // Silencioso
      }
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
          // Solo para saber si se cobró (el panel no ofrece "No vino" en un turno ya pagado).
          pagos: { select: { idPago: true } },
        },
      }),
      this.prisma.turno.count({ where }),
    ]);
    return paginar(data, total, page, limit);
  }

  async findOne(id: number): Promise<Turno & { detalles: any[]; persona: any; pagos: Pago[] }> {
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

  async cancelar(id: number, origen: OrigenCancelacion = 'PANEL'): Promise<Turno> {
    const turno = await this.findOne(id);
    const estado = getTurnoState(turno.estado);
    estado.cancelar();

    await this.borrarEventoCalendar(turno.googleEventId);

    return this.prisma.turno.update({
      where: { idTurno: id },
      data: { estado: 'CANCELADO', googleEventId: null, canceladoEn: new Date(), canceladoPor: origen },
    });
  }

  // ─── Cancelación por el cliente (link del mail) ───

  /**
   * Link "Cancelar turno" para los mails al cliente. null si falta
   * FRONTEND_URL o JWT_SECRET: en ese caso el mail sale sin el botón, igual
   * que antes, en vez de mandar un link roto.
   */
  urlCancelacionDe(idTurno: number): string | null {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const secreto = this.configService.get<string>('JWT_SECRET');
    if (!frontendUrl || !secreto) return null;
    return urlCancelacion(frontendUrl, idTurno, secreto);
  }

  /** Datos para la página pública de cancelación. Token inválido o turno inexistente → mismo 404, sin dar pistas. */
  async getTurnoParaCancelar(token: string): Promise<TurnoParaCancelar> {
    const turno = await this.turnoDesdeToken(token);
    return {
      nombreCliente: turno.persona.nombre,
      fechaHoraInicio: turno.fechaHoraInicio,
      servicios: turno.detalles.map((d: any) => d.servicio.nombre),
      estado: turno.estado,
      puedeCancelar: this.puedeCancelarCliente(turno),
    };
  }

  /**
   * Cancela el turno desde el link del mail. Siempre se permite mientras el
   * turno no haya empezado (sin límite de horas): el horario queda libre y al
   * barbero le llega un aviso. Si el turno ya estaba cancelado, responde OK
   * sin hacer nada (doble clic, o el cliente vuelve a abrir el link).
   */
  async cancelarPorCliente(token: string): Promise<TurnoParaCancelar> {
    const turno = await this.turnoDesdeToken(token);

    if (turno.estado !== 'CANCELADO') {
      if (!this.puedeCancelarCliente(turno)) {
        throw new BadRequestException('Este turno ya no se puede cancelar desde la web. Escribinos por WhatsApp.');
      }

      // Update condicionado al estado: si en el medio el cron lo pasó a
      // EN_PROCESO, o entró otro clic al mismo tiempo, no se pisa nada y no
      // se manda un segundo aviso al barbero.
      const canceladoEn = new Date();
      const { count } = await this.prisma.turno.updateMany({
        where: { idTurno: turno.idTurno, estado: { in: ESTADOS_CANCELABLES_POR_CLIENTE } },
        data: { estado: 'CANCELADO', googleEventId: null, canceladoEn, canceladoPor: 'CLIENTE' },
      });

      if (count === 1) {
        await this.borrarEventoCalendar(turno.googleEventId);
        await this.avisarCancelacionAlBarbero(turno, canceladoEn);
      }
    }

    return this.getTurnoParaCancelar(token);
  }

  private async turnoDesdeToken(token: string) {
    const secreto = this.configService.get<string>('JWT_SECRET');
    const idTurno = secreto ? verificarTokenCancelacion(token, secreto) : null;
    const turno = idTurno
      ? await this.prisma.turno.findUnique({
          where: { idTurno },
          include: { persona: true, detalles: { include: { servicio: true } } },
        })
      : null;
    if (!turno) {
      throw new NotFoundException('El link de cancelación no es válido');
    }
    return turno;
  }

  private puedeCancelarCliente(turno: { estado: string; fechaHoraInicio: Date }): boolean {
    return ESTADOS_CANCELABLES_POR_CLIENTE.includes(turno.estado) && turno.fechaHoraInicio.getTime() > Date.now();
  }

  /**
   * Destinatarios: el email de contacto del negocio (Configuración → Marca).
   * Si no está cargado, los usuarios del panel. Best-effort: si falla, la
   * cancelación ya quedó hecha y solo se loguea.
   */
  private async avisarCancelacionAlBarbero(
    turno: { idTurno: number; fechaHoraInicio: Date; persona: { nombre: string; apellido: string; telefono: string | null }; detalles: any[] },
    canceladoEn: Date,
  ): Promise<void> {
    try {
      const config = await this.prisma.configuracionNegocio.findUnique({ where: { id: CONFIG_ID } });
      const destinatarios = await this.destinatariosDelNegocio(config);

      await this.mailService.sendAvisoCancelacion(destinatarios, {
        nombreCliente: `${turno.persona.nombre} ${turno.persona.apellido}`.trim(),
        telefonoCliente: turno.persona.telefono,
        fechaHoraInicio: turno.fechaHoraInicio,
        canceladoEn,
        servicios: turno.detalles.map((d: any) => d.servicio.nombre),
        nombreNegocio: config?.nombre,
        colorPrimario: config?.colorPrimario,
      });
    } catch (err) {
      this.logger.error(`Fallo al avisar la cancelación del turno ${turno.idTurno}: ${err}`);
    }
  }

  /** El email de contacto del negocio (Configuración → Marca); si no está cargado, los usuarios del panel. */
  private async destinatariosDelNegocio(config: { email: string | null } | null): Promise<string[]> {
    if (config?.email) return [config.email];
    const usuarios = await this.prisma.usuarioWeb.findMany({ select: { email: true } });
    return usuarios.map((u) => u.email).filter(Boolean);
  }

  private async borrarEventoCalendar(googleEventId: string | null): Promise<void> {
    if (!googleEventId) return;
    try {
      await this.googleCalendarService.deleteEvent(googleEventId);
    } catch {
      // Silencioso: no falla si Google Calendar no está conectado
    }
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

    // Excepción a la regla del State: un turno COMPLETADO sin ningún pago es
    // uno que el cron cerró solo por horario, sin que nadie lo atendiera ni
    // cobrara. Ese sí se puede corregir a "no vino". Si ya tiene pagos, se
    // atendió de verdad y no se toca.
    if (turno.estado === 'COMPLETADO') {
      if (turno.pagos.length > 0) {
        throw new BadRequestException('No se puede marcar que no vino: el turno ya tiene pagos registrados');
      }
    } else {
      getTurnoState(turno.estado).marcarNoShow();
    }

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

  /** Franjas horarias (abre/cierra) configuradas para un día; [] si no hay horarios cargados para ese día. */
  private franjasDelDia(horarioDia: HorarioDiaConfig | undefined): { abre: string; cierra: string }[] {
    if (!horarioDia || horarioDia.cerrado) return [];
    const franjas: { abre: string; cierra: string }[] = [];
    if (horarioDia.abre && horarioDia.cierra) franjas.push({ abre: horarioDia.abre, cierra: horarioDia.cierra });
    if (horarioDia.abre2 && horarioDia.cierra2) franjas.push({ abre: horarioDia.abre2, cierra: horarioDia.cierra2 });
    return franjas;
  }

  /**
   * Valida que [fechaHoraInicio, fechaHoraFin) entre completo dentro de
   * alguna franja de atención del día (configuracion_negocio.horarios), sin
   * cruzar un día cerrado ni el hueco entre franjas (ej. horario partido).
   * Es la misma fuente de horarios que usa getDisponibilidad() para sugerir
   * slots; acá se usa para no dejar crear un turno fuera de esos horarios.
   */
  private async verificarHorarioAtencion(fechaHoraInicio: Date, fechaHoraFin: Date): Promise<void> {
    const config = await this.prisma.configuracionNegocio.findUnique({ where: { id: CONFIG_ID } });
    const horarios = (config?.horarios as unknown as HorarioDiaConfig[] | null) ?? [];

    const fechaCalendario = diaCalendarioAr(fechaHoraInicio);
    const diaSemana = fechaCalendario.getUTCDay();
    const horarioDia = horarios.find((h) => h.dia === diaSemana);
    const franjas = this.franjasDelDia(horarioDia);

    if (franjas.length === 0) {
      throw new BadRequestException('El negocio está cerrado ese día');
    }

    const entraEnAlgunaFranja = franjas.some((franja) => {
      const [horaAbre, minAbre] = franja.abre.split(':').map(Number);
      const [horaCierra, minCierra] = franja.cierra.split(':').map(Number);
      const inicioFranja = horaArAUtc(fechaCalendario, horaAbre, minAbre);
      const finFranja = horaArAUtc(fechaCalendario, horaCierra, minCierra);
      return fechaHoraInicio >= inicioFranja && fechaHoraFin <= finFranja;
    });

    if (!entraEnAlgunaFranja) {
      throw new BadRequestException('El horario elegido está fuera de la atención del negocio');
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
   * Se corre al entrar a COMPLETADO (una sola vez, ver el chequeo de estado).
   * Si el servicio ya tenía un cupón menor, el descuento del club lo reemplaza.
   */
  private async aplicarDescuentoFidelizacion(turno: Turno & { idPersona: number; persona: { aplicaDescuentoPersonal: boolean }; detalles: any[] }): Promise<void> {
    const config = await this.prisma.configuracionNegocio.findUnique({ where: { id: CONFIG_ID } });
    if (!config?.fidelizacionActiva || !config.fidelizacionVisitasRequeridas || config.fidelizacionDescuentoPorcentaje == null) {
      return;
    }

    if (turno.persona.aplicaDescuentoPersonal) return;
    // Ya se calculó al entrar a COMPLETADO (acá se vuelve a pasar con cada
    // pago parcial): si se recalculara, el turno ya figuraría entre las
    // visitas previas y la numeración se correría una.
    if (turno.estado === 'COMPLETADO') return;

    // Todos los servicios que suman cuentan como visita, tengan o no un
    // cupón (mismo conteo que contarVisitasCompletadas y que el contador del mail).
    const detallesQueCuentan = turno.detalles
      .filter((d: any) => d.servicio?.cuentaParaFidelizacion)
      .sort((a: any, b: any) => a.idTurnoDetalle - b.idTurnoDetalle);
    if (detallesQueCuentan.length === 0) return;

    const visitasPrevias = await contarVisitasCompletadas(this.prisma, turno.idPersona, config.fidelizacionFechaInicio);

    const visitasRequeridas = config.fidelizacionVisitasRequeridas;
    const descuentoPorcentaje = Number(config.fidelizacionDescuentoPorcentaje);

    for (let i = 0; i < detallesQueCuentan.length; i++) {
      const numeroVisita = visitasPrevias + i + 1;
      // No se acumula con un cupón: queda el mayor de los dos.
      if (numeroVisita % visitasRequeridas === 0 && Number(detallesQueCuentan[i].descuentoPorcentaje) < descuentoPorcentaje) {
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

    const franjas = this.franjasDelDia(horarioDia);
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
    const primerInicioPosible = this.primerInicioReservable(config?.reservaAnticipacionMinutos);
    for (const franja of franjas) {
      const [horaAbre, minAbre] = franja.abre.split(':').map(Number);
      const [horaCierra, minCierra] = franja.cierra.split(':').map(Number);
      const inicioFranja = horaArAUtc(fecha, horaAbre, minAbre);
      const finFranja = horaArAUtc(fecha, horaCierra, minCierra);

      for (let t = inicioFranja.getTime(); ; t += intervalo * 60000) {
        const slotInicio = new Date(t);
        const slotFin = new Date(slotInicio.getTime() + duracionTotal * 60000);

        if (slotFin > finFranja) break;
        if (slotInicio < primerInicioPosible) continue;

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

  private primerInicioReservable(anticipacionMinutos: number | null | undefined): Date {
    return new Date(Date.now() + (anticipacionMinutos ?? ANTICIPACION_RESERVA_DEFECTO_MIN) * 60_000);
  }

  /**
   * Para el paso "Tus datos" del turnero público: si el email ya es de un
   * cliente, el frontend se salta el formulario de nombre/apellido/teléfono.
   * faltaFechaNacimiento: si no tiene el cumpleaños cargado, se le pide solo ese dato.
   * fidelizacion: cuántas visitas lleva en el club (null si el programa está apagado).
   */
  async buscarClientePorEmail(
    email: string,
  ): Promise<{ existe: boolean; nombre?: string; faltaFechaNacimiento?: boolean; fidelizacion?: ProgresoCliente | null }> {
    const persona = await this.prisma.persona.findUnique({
      where: { mail: email },
      select: { idPersona: true, nombre: true, fechaNacimiento: true, aplicaDescuentoPersonal: true },
    });
    if (!persona) return { existe: false };

    const config = await this.prisma.configuracionNegocio.findUnique({ where: { id: CONFIG_ID } });
    return {
      existe: true,
      nombre: persona.nombre,
      faltaFechaNacimiento: !persona.fechaNacimiento,
      fidelizacion: await progresoDeCliente(this.prisma, config, persona),
    };
  }

  /** Formas de pago vigentes, para el selector del formulario de reserva pública. */
  async listarFormasPago(): Promise<{ idFormaPago: number; nombre: string }[]> {
    return this.prisma.formaPago.findMany({
      where: { vigente: true },
      orderBy: { idFormaPago: 'asc' },
      select: { idFormaPago: true, nombre: true },
    });
  }

  async reservarPublica(data: { nombre?: string; apellido?: string; email: string; telefono?: string; fechaNacimiento?: string; codigoCupon?: string; fechaHoraInicio: string; observacion?: string; servicios: { idServicio: number; cantidad?: number }[]; idFormaPagoPreferida: number }): Promise<Turno> {
    // 0. Antes de crear la persona: si no, un horario rechazado igual dejaba
    // un cliente nuevo cargado.
    const config = await this.prisma.configuracionNegocio.findUnique({ where: { id: CONFIG_ID } });
    if (new Date(data.fechaHoraInicio) < this.primerInicioReservable(config?.reservaAnticipacionMinutos)) {
      throw new BadRequestException('Ese horario ya pasó o no llega a la anticipación mínima para reservar online. Elegí otro horario.');
    }
    const fechaNacimiento = this.parsearFechaNacimiento(data.fechaNacimiento);
    // Vigencia y cupo antes de crear la persona; "ya lo usaste" se vuelve a
    // chequear adentro de la transacción del turno.
    const cupon = data.codigoCupon?.trim() ? await this.cuponesService.buscarAplicable(data.codigoCupon) : undefined;
    if (cupon) await this.cuponesService.verificarUsos(this.prisma, cupon, { email: data.email });

    // 1. Buscar o crear persona por email
    let persona = await this.prisma.persona.findUnique({
      where: { mail: data.email },
    });

    let clienteNuevo = false;
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
          fechaNacimiento,
        },
      });
      clienteNuevo = true;
    } else if (fechaNacimiento && !persona.fechaNacimiento) {
      // Solo se completa si faltaba: para reservar alcanza con saber un
      // email, así que una fecha ya cargada no se pisa desde acá.
      persona = await this.prisma.persona.update({
        where: { idPersona: persona.idPersona },
        data: { fechaNacimiento },
      });
    }

    // 2. Descuento de personal: acá no hay checkbox que tildar (es autogestionado
    // y público), así que si la persona ya está marcada para el descuento y el
    // descuento está activo, se aplica solo. Verificamos el estado del
    // descuento nosotros mismos antes de pedirlo, para que reservar nunca
    // falle por esto — si no está activo, simplemente no se aplica.
    let aplicarDescuentoEmpleado = false;
    if (persona.aplicaDescuentoPersonal) {
      aplicarDescuentoEmpleado = !!config?.descuentoEmpleadoActivo && config.descuentoEmpleadoPorcentaje != null;
    }

    // 3. Crear turno usando el método existente
    const createDto = {
      idPersona: persona.idPersona,
      fechaHoraInicio: data.fechaHoraInicio,
      observacion: data.observacion,
      servicios: data.servicios,
      aplicarDescuentoEmpleado,
      idFormaPagoPreferida: data.idFormaPagoPreferida,
    };

    const turno = await this.create(createDto, { cupon });

    // 4. Aviso al negocio. Solo acá y no en create(): los turnos cargados
    // desde el panel los carga el mismo dueño.
    await this.avisarNuevaReservaAlNegocio(turno, clienteNuevo, config, turno.idCupon ? cupon : undefined);

    return turno;
  }

  /** AAAA-MM-DD → Date (UTC, columna DATE). Rechaza fechas inexistentes, futuras o anteriores a 1900. */
  private parsearFechaNacimiento(valor: string | undefined): Date | null {
    if (!valor) return null;
    const fecha = new Date(`${valor}T00:00:00.000Z`);
    if (isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== valor || valor < '1900-01-01' || fecha.getTime() > Date.now()) {
      throw new BadRequestException('La fecha de cumpleaños no es válida');
    }
    return fecha;
  }

  /** Best-effort: si el mail falla, el turno ya quedó reservado y solo se loguea. */
  private async avisarNuevaReservaAlNegocio(
    turno: Turno & { detalles: any[]; persona: any },
    clienteNuevo: boolean,
    config: { email: string | null; nombre: string; colorPrimario: string | null } | null,
    cupon?: Cupon,
  ): Promise<void> {
    try {
      const destinatarios = await this.destinatariosDelNegocio(config);
      const formaPago = turno.idFormaPagoPreferida
        ? await this.prisma.formaPago.findUnique({ where: { idFormaPago: turno.idFormaPagoPreferida }, select: { nombre: true } })
        : null;
      const frontendUrl = this.configService.get<string>('FRONTEND_URL');
      const nacimiento: Date | null = turno.persona.fechaNacimiento ? new Date(turno.persona.fechaNacimiento) : null;

      await this.mailService.sendAvisoNuevaReserva(destinatarios, {
        nombreCliente: `${turno.persona.nombre} ${turno.persona.apellido}`.trim(),
        telefonoCliente: turno.persona.telefono,
        emailCliente: turno.persona.mail,
        fechaHoraInicio: turno.fechaHoraInicio,
        servicios: turno.detalles.map((d: any) => d.servicio.nombre),
        formaPago: formaPago?.nombre,
        observacion: turno.observacion,
        cumpleanos: nacimiento
          ? `${String(nacimiento.getUTCDate()).padStart(2, '0')}/${String(nacimiento.getUTCMonth() + 1).padStart(2, '0')}`
          : null,
        clienteNuevo,
        cupon: cupon ? { codigo: cupon.codigo, descuentoPorcentaje: Number(cupon.descuentoPorcentaje) } : null,
        panelUrl: frontendUrl ? `${frontendUrl.replace(/\/+$/, '')}/turnos` : null,
        nombreNegocio: config?.nombre,
        colorPrimario: config?.colorPrimario,
      });
    } catch (err) {
      this.logger.error(`Fallo al avisar la nueva reserva del turno ${turno.idTurno}: ${err}`);
    }
  }
}
