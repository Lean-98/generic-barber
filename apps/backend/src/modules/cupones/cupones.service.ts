import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Cupon, Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { diaCalendarioAr, finDiaAr, inicioDiaAr } from '../../common/utils/fecha-ar.util';
import { CreateCuponDto, UpdateCuponDto } from './dto/cupon.dto';

/** Lo que el sistema pueda usar para contar: el cliente normal o el de una transacción. */
type Db = Pick<PrismaClient, 'turno' | 'persona'> | Prisma.TransactionClient;

export type EstadoCupon = 'ACTIVO' | 'PAUSADO' | 'PROGRAMADO' | 'VENCIDO' | 'AGOTADO';

export interface CuponPanel {
  idCupon: number;
  codigo: string;
  descripcion: string | null;
  descuentoPorcentaje: number;
  /** AAAA-MM-DD, hora Argentina (inclusive). */
  desde: string;
  hasta: string;
  usosMaximos: number | null;
  usos: number;
  activo: boolean;
  estado: EstadoCupon;
  origen: string;
  /** Cupón personal (el de cumpleaños): a quién pertenece. */
  persona: { idPersona: number; nombre: string; apellido: string } | null;
}

export type ValidacionCupon =
  | { valido: true; codigo: string; descuentoPorcentaje: number; hasta: string }
  | { valido: false; mensaje: string };

/** Turnos que ocupan un cupón: todos menos los cancelados (cancelar devuelve el cupón). */
const ESTADOS_QUE_NO_USAN = ['CANCELADO'];

export function normalizarCodigo(codigo: string): string {
  return (codigo ?? '').trim().toUpperCase();
}

function fechaAr(instante: Date): string {
  return diaCalendarioAr(instante).toISOString().slice(0, 10);
}

/**
 * Cupones de descuento para la reserva online. Reglas: valen para las
 * reservas hechas dentro de la vigencia (no importa el día del turno), una
 * vez por cliente, para todos los servicios y sin acumularse con otros
 * descuentos (se aplica el mayor, ver TurnosService.create).
 */
@Injectable()
export class CuponesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Panel ───

  /** origen: "PROMO" (los del panel) o "CUMPLEANOS"; sin filtro, todos. */
  async findAll(origen?: string): Promise<CuponPanel[]> {
    const [cupones, usos] = await Promise.all([
      this.prisma.cupon.findMany({
        where: origen ? { origen } : undefined,
        orderBy: { vigenteDesde: 'desc' },
        include: { persona: { select: { idPersona: true, nombre: true, apellido: true } } },
      }),
      this.prisma.turno.groupBy({
        by: ['idCupon'],
        where: { idCupon: { not: null }, estado: { notIn: ESTADOS_QUE_NO_USAN } },
        _count: { _all: true },
      }),
    ]);
    const usosPorCupon = new Map(usos.map((u) => [u.idCupon, u._count._all]));
    return cupones.map((c) => this.aPanel(c, usosPorCupon.get(c.idCupon) ?? 0));
  }

  async create(dto: CreateCuponDto): Promise<CuponPanel> {
    const { vigenteDesde, vigenteHasta } = this.vigencia(dto.desde, dto.hasta);
    await this.verificarCodigoLibre(dto.codigo);
    const cupon = await this.prisma.cupon.create({
      data: {
        codigo: dto.codigo,
        descripcion: dto.descripcion?.trim() || null,
        descuentoPorcentaje: dto.descuentoPorcentaje,
        vigenteDesde,
        vigenteHasta,
        usosMaximos: dto.usosMaximos ?? null,
      },
    });
    return this.aPanel(cupon, 0);
  }

  async update(id: number, dto: UpdateCuponDto): Promise<CuponPanel> {
    const actual = await this.buscar(id);
    if (dto.codigo && dto.codigo !== actual.codigo) await this.verificarCodigoLibre(dto.codigo);

    const desde = dto.desde ?? fechaAr(actual.vigenteDesde);
    const hasta = dto.hasta ?? fechaAr(actual.vigenteHasta);
    const { vigenteDesde, vigenteHasta } = this.vigencia(desde, hasta);

    const cupon = await this.prisma.cupon.update({
      where: { idCupon: id },
      data: {
        codigo: dto.codigo,
        descripcion: dto.descripcion === undefined ? undefined : dto.descripcion.trim() || null,
        descuentoPorcentaje: dto.descuentoPorcentaje,
        vigenteDesde,
        vigenteHasta,
        usosMaximos: dto.usosMaximos === undefined ? undefined : dto.usosMaximos,
        activo: dto.activo,
      },
    });
    return this.aPanel(cupon, await this.contarUsos(this.prisma, id));
  }

  /** Solo si nunca se usó: si no, se perdería de qué cupón vino el descuento de esos turnos. */
  async remove(id: number): Promise<void> {
    await this.buscar(id);
    const turnos = await this.prisma.turno.count({ where: { idCupon: id } });
    if (turnos > 0) {
      throw new BadRequestException('Este cupón ya se usó en turnos: pausalo en vez de borrarlo.');
    }
    await this.prisma.cupon.delete({ where: { idCupon: id } });
  }

  // ─── Reserva online ───

  /** Para la página /reservar: nunca tira error, devuelve el motivo para mostrarlo. */
  async validarParaReserva(codigo: string, email?: string): Promise<ValidacionCupon> {
    try {
      const cupon = await this.buscarAplicable(codigo);
      await this.verificarUsos(this.prisma, cupon, email ? { email } : null);
      return {
        valido: true,
        codigo: cupon.codigo,
        descuentoPorcentaje: Number(cupon.descuentoPorcentaje),
        hasta: fechaAr(cupon.vigenteHasta),
      };
    } catch (err) {
      if (err instanceof BadRequestException) return { valido: false, mensaje: err.message };
      throw err;
    }
  }

  /** El cupón si existe, está activo y hoy está dentro de su vigencia. Si no, BadRequest con el motivo. */
  async buscarAplicable(codigo: string, ahora = new Date()): Promise<Cupon> {
    const cupon = await this.prisma.cupon.findUnique({ where: { codigo: normalizarCodigo(codigo) } });
    if (!cupon) throw new BadRequestException('Ese cupón no existe. Revisá que esté bien escrito.');
    if (!cupon.activo) throw new BadRequestException('Ese cupón no está disponible.');
    if (ahora < cupon.vigenteDesde) throw new BadRequestException('Ese cupón todavía no está vigente.');
    if (ahora > cupon.vigenteHasta) throw new BadRequestException('Ese cupón ya venció.');
    return cupon;
  }

  /**
   * Cupo total y una vez por cliente. Se llama también adentro de la
   * transacción que crea el turno, para que dos reservas simultáneas no se
   * lleven el último lugar las dos.
   */
  async verificarUsos(db: Db, cupon: Cupon, cliente: { idPersona: number } | { email: string } | null): Promise<void> {
    if (cupon.usosMaximos != null && (await this.contarUsos(db, cupon.idCupon)) >= cupon.usosMaximos) {
      throw new BadRequestException('Ese cupón ya se agotó.');
    }
    if (cupon.idPersona != null) {
      // Personal: sin saber quién es todavía (link abierto sin email) se deja
      // pasar; al reservar siempre se sabe y se vuelve a chequear.
      if (cliente && !(await this.esDuenioDelCupon(db, cupon.idPersona, cliente))) {
        throw new BadRequestException('Este cupón es personal y no corresponde a tu email.');
      }
    }
    if (cliente) {
      const persona = 'idPersona' in cliente ? { idPersona: cliente.idPersona } : { persona: { mail: cliente.email } };
      const usados = await db.turno.count({
        where: { idCupon: cupon.idCupon, estado: { notIn: ESTADOS_QUE_NO_USAN }, ...persona },
      });
      if (usados > 0) throw new BadRequestException('Ya usaste este cupón.');
    }
  }

  // ─── Internos ───

  private async esDuenioDelCupon(db: Db, idPersona: number, cliente: { idPersona: number } | { email: string }): Promise<boolean> {
    if ('idPersona' in cliente) return cliente.idPersona === idPersona;
    const persona = await db.persona.findUnique({ where: { idPersona }, select: { mail: true } });
    return !!persona?.mail && persona.mail.toLowerCase() === cliente.email.trim().toLowerCase();
  }

  private contarUsos(db: Db, idCupon: number): Promise<number> {
    return db.turno.count({ where: { idCupon, estado: { notIn: ESTADOS_QUE_NO_USAN } } });
  }

  private async buscar(id: number): Promise<Cupon> {
    const cupon = await this.prisma.cupon.findUnique({ where: { idCupon: id } });
    if (!cupon) throw new NotFoundException(`Cupón con id ${id} no encontrado`);
    return cupon;
  }

  private async verificarCodigoLibre(codigo: string): Promise<void> {
    if (await this.prisma.cupon.findUnique({ where: { codigo } })) {
      throw new ConflictException(`Ya existe un cupón con el código ${codigo}.`);
    }
  }

  /** Días AAAA-MM-DD (hora Argentina, inclusive) → instantes de inicio y fin. */
  private vigencia(desde: string, hasta: string): { vigenteDesde: Date; vigenteHasta: Date } {
    const d = new Date(`${desde}T00:00:00.000Z`);
    const h = new Date(`${hasta}T00:00:00.000Z`);
    if (isNaN(d.getTime()) || isNaN(h.getTime()) || d.toISOString().slice(0, 10) !== desde || h.toISOString().slice(0, 10) !== hasta) {
      throw new BadRequestException('Las fechas del cupón no son válidas.');
    }
    if (h < d) throw new BadRequestException('La fecha de fin tiene que ser igual o posterior a la de inicio.');
    return { vigenteDesde: inicioDiaAr(d), vigenteHasta: finDiaAr(h) };
  }

  private aPanel(
    c: Cupon & { persona?: { idPersona: number; nombre: string; apellido: string } | null },
    usos: number,
    ahora = new Date(),
  ): CuponPanel {
    let estado: EstadoCupon = 'ACTIVO';
    if (!c.activo) estado = 'PAUSADO';
    else if (ahora > c.vigenteHasta) estado = 'VENCIDO';
    else if (ahora < c.vigenteDesde) estado = 'PROGRAMADO';
    else if (c.usosMaximos != null && usos >= c.usosMaximos) estado = 'AGOTADO';

    return {
      idCupon: c.idCupon,
      codigo: c.codigo,
      descripcion: c.descripcion,
      descuentoPorcentaje: Number(c.descuentoPorcentaje),
      desde: fechaAr(c.vigenteDesde),
      hasta: fechaAr(c.vigenteHasta),
      usosMaximos: c.usosMaximos,
      usos,
      activo: c.activo,
      estado,
      origen: c.origen,
      persona: c.persona ?? null,
    };
  }
}
