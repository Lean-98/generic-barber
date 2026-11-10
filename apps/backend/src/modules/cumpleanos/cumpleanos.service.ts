import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { Cupon, Prisma } from '@prisma/client';
import { randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { diaCalendarioAr, finDiaAr, hoyAr, inicioDiaAr } from '../../common/utils/fecha-ar.util';
import { codigoCumple, cumpleEnAnio, diaMes, envioCorrespondiente, proximoCumple, sumarDias } from './cumpleanos.util';
import { urlBaja, verificarTokenBaja } from './baja-promociones-token.util';

const CONFIG_ID = 1;

/** El cumple al que corresponde un cupón (para el texto del recordatorio). */
function proximoCumpleDelCupon(nacimiento: Date | null, anio: number | null): Date {
  return nacimiento && anio ? cumpleEnAnio(nacimiento, anio) : hoyAr();
}
const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O ni 1/I, que se confunden al dictarlos

export interface CumpleanosProximo {
  idPersona: number;
  nombre: string;
  apellido: string;
  telefono: string | null;
  mail: string | null;
  /** AAAA-MM-DD del próximo cumple. */
  fecha: string;
  edad: number;
  esHoy: boolean;
  recibePromociones: boolean;
  cupon: { codigo: string; descuentoPorcentaje: number; hasta: string; usado: boolean } | null;
}

export interface PreferenciaPromociones {
  nombre: string;
  recibePromociones: boolean;
}

/**
 * Beneficio de cumpleaños: cada día genera el cupón personal de quienes
 * cumplen dentro de la anticipación configurada y se lo manda por mail.
 * Solo a quienes aceptan promociones, tienen email y no son empleados (esos
 * tienen su propio descuento). El cupón se usa una vez, solo con su email y
 * para reservas hechas dentro de la vigencia (ver CuponesService).
 */
@Injectable()
export class CumpleanosService {
  private readonly logger = new Logger(CumpleanosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  @Cron('0 10 * * *', { timeZone: 'America/Argentina/Buenos_Aires' })
  async procesarDelDia(): Promise<void> {
    await this.enviarCuponesDelDia();
    await this.enviarRecordatorios();
  }

  async enviarCuponesDelDia(): Promise<void> {
    const config = await this.prisma.configuracionNegocio.findUnique({ where: { id: CONFIG_ID } });
    if (!config?.cumpleActivo) return;

    const hoy = hoyAr();
    const personas = await this.prisma.persona.findMany({
      where: { fechaNacimiento: { not: null }, mail: { not: null }, recibePromociones: true, aplicaDescuentoPersonal: false },
    });

    for (const persona of personas) {
      const envio = envioCorrespondiente(persona.fechaNacimiento!, hoy, config.cumpleDiasAnticipacion, config.cumpleDiasValidez);
      if (!envio) continue;

      try {
        const cupon = await this.crearCupon(persona, envio, Number(config.cumpleDescuentoPorcentaje));
        if (!cupon) continue; // ya tenía el de este año

        await this.mailService.sendCuponCumpleanos(persona.mail!, {
          nombreCliente: persona.nombre,
          codigo: cupon.codigo,
          descuentoPorcentaje: Number(cupon.descuentoPorcentaje),
          fechaCumple: diaMes(envio.cumple),
          hasta: diaMes(envio.hasta),
          reservarUrl: this.urlReservar(cupon.codigo),
          bajaUrl: this.urlBajaDe(persona.idPersona),
          nombreNegocio: config.nombre,
          logoUrl: config.logoUrl,
          colorPrimario: config.colorPrimario,
        });
      } catch (err) {
        this.logger.error(`Fallo con el cupón de cumpleaños de la persona ${persona.idPersona}: ${err}`);
      }
    }
  }

  /**
   * Aviso de que el cupón vence: a los que no lo usaron, cuando le quedan
   * cumpleDiasRecordatorio días (o menos, si el proceso no corrió algún
   * día). Uno solo por cupón; no al que lo recibió hoy mismo.
   */
  async enviarRecordatorios(): Promise<void> {
    const config = await this.prisma.configuracionNegocio.findUnique({ where: { id: CONFIG_ID } });
    if (!config?.cumpleActivo || config.cumpleDiasRecordatorio <= 0) return;

    const ahora = new Date();
    const hoy = hoyAr();
    const limite = finDiaAr(sumarDias(hoy, config.cumpleDiasRecordatorio));
    const cupones = await this.prisma.cupon.findMany({
      where: {
        origen: 'CUMPLEANOS',
        activo: true,
        recordatorioEnviadoEn: null,
        vigenteDesde: { lte: ahora },
        vigenteHasta: { gte: ahora, lte: limite },
        createdAt: { lt: inicioDiaAr(hoy) },
        turnos: { none: { estado: { not: 'CANCELADO' } } },
        persona: { recibePromociones: true, mail: { not: null } },
      },
      include: { persona: true },
    });

    for (const cupon of cupones) {
      try {
        const enviado = await this.mailService.sendCuponCumpleanos(cupon.persona!.mail!, {
          nombreCliente: cupon.persona!.nombre,
          codigo: cupon.codigo,
          descuentoPorcentaje: Number(cupon.descuentoPorcentaje),
          fechaCumple: diaMes(proximoCumpleDelCupon(cupon.persona!.fechaNacimiento, cupon.anioCumpleanos)),
          hasta: diaMes(diaCalendarioAr(cupon.vigenteHasta)),
          reservarUrl: this.urlReservar(cupon.codigo),
          bajaUrl: this.urlBajaDe(cupon.persona!.idPersona),
          nombreNegocio: config.nombre,
          logoUrl: config.logoUrl,
          colorPrimario: config.colorPrimario,
          recordatorio: true,
        });
        if (enviado) {
          await this.prisma.cupon.update({ where: { idCupon: cupon.idCupon }, data: { recordatorioEnviadoEn: new Date() } });
        }
      } catch (err) {
        this.logger.error(`Fallo el recordatorio del cupón de cumpleaños ${cupon.idCupon}: ${err}`);
      }
    }
  }

  /** Cumpleaños de hoy y de los próximos `dias` días, para el Dashboard (con el cupón si ya se generó). */
  async proximos(dias = 7): Promise<CumpleanosProximo[]> {
    const hoy = hoyAr();
    const limite = sumarDias(hoy, dias);
    const personas = await this.prisma.persona.findMany({
      where: { fechaNacimiento: { not: null } },
      include: {
        cupones: {
          where: { origen: 'CUMPLEANOS' },
          include: { turnos: { where: { estado: { not: 'CANCELADO' } }, select: { idTurno: true } } },
        },
      },
    });

    return personas
      .map((p) => ({ p, cumple: proximoCumple(p.fechaNacimiento!, hoy) }))
      .filter(({ cumple }) => cumple <= limite)
      .sort((a, b) => a.cumple.getTime() - b.cumple.getTime())
      .map(({ p, cumple }) => {
        const cupon = p.cupones.find((c) => c.anioCumpleanos === cumple.getUTCFullYear());
        return {
          idPersona: p.idPersona,
          nombre: p.nombre,
          apellido: p.apellido,
          telefono: p.telefono,
          mail: p.mail,
          fecha: cumple.toISOString().slice(0, 10),
          edad: cumple.getUTCFullYear() - p.fechaNacimiento!.getUTCFullYear(),
          esHoy: cumple.getTime() === hoy.getTime(),
          recibePromociones: p.recibePromociones,
          cupon: cupon
            ? {
                codigo: cupon.codigo,
                descuentoPorcentaje: Number(cupon.descuentoPorcentaje),
                hasta: diaMes(diaCalendarioAr(cupon.vigenteHasta)),
                usado: cupon.turnos.length > 0,
              }
            : null,
        };
      });
  }

  // ─── Baja de promociones (link de los mails) ───

  async getPreferencia(token: string): Promise<PreferenciaPromociones> {
    const persona = await this.personaDesdeToken(token);
    return { nombre: persona.nombre, recibePromociones: persona.recibePromociones };
  }

  async setPreferencia(token: string, recibePromociones: boolean): Promise<PreferenciaPromociones> {
    const persona = await this.personaDesdeToken(token);
    const actualizada = await this.prisma.persona.update({
      where: { idPersona: persona.idPersona },
      data: { recibePromociones },
    });
    return { nombre: actualizada.nombre, recibePromociones: actualizada.recibePromociones };
  }

  // ─── Internos ───

  /** null si ya existía el cupón de ese año (o lo creó otra corrida al mismo tiempo). */
  private async crearCupon(
    persona: { idPersona: number; nombre: string },
    envio: { cumple: Date; desde: Date; hasta: Date },
    descuentoPorcentaje: number,
  ): Promise<Cupon | null> {
    const anio = envio.cumple.getUTCFullYear();
    const existente = await this.prisma.cupon.findUnique({
      where: { idPersona_anioCumpleanos: { idPersona: persona.idPersona, anioCumpleanos: anio } },
    });
    if (existente) return null;

    for (let intento = 0; intento < 5; intento++) {
      try {
        return await this.prisma.cupon.create({
          data: {
            codigo: codigoCumple(persona.nombre, () => this.azar()),
            descripcion: `Cumpleaños ${diaMes(envio.cumple)}`,
            descuentoPorcentaje,
            vigenteDesde: inicioDiaAr(envio.desde),
            vigenteHasta: finDiaAr(envio.hasta),
            usosMaximos: 1,
            origen: 'CUMPLEANOS',
            idPersona: persona.idPersona,
            anioCumpleanos: anio,
          },
        });
      } catch (err) {
        if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err;
        // El índice que chocó viene como lista de campos o como nombre, según la versión.
        if (String(err.meta?.target ?? '').toLowerCase().includes('persona')) return null; // otra corrida ya lo creó
        // Si chocó el código (muy raro), se prueba con otro.
      }
    }
    throw new Error('No se pudo generar un código de cupón único');
  }

  private azar(): string {
    return Array.from({ length: 4 }, () => LETRAS[randomInt(LETRAS.length)]).join('');
  }

  private urlReservar(codigo: string): string {
    const base = (this.configService.get<string>('FRONTEND_URL') ?? '').replace(/\/+$/, '');
    return `${base}/reservar?cupon=${encodeURIComponent(codigo)}`;
  }

  private urlBajaDe(idPersona: number): string | null {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const secreto = this.configService.get<string>('JWT_SECRET');
    return frontendUrl && secreto ? urlBaja(frontendUrl, idPersona, secreto) : null;
  }

  private async personaDesdeToken(token: string) {
    const secreto = this.configService.get<string>('JWT_SECRET');
    const id = secreto ? verificarTokenBaja(token, secreto) : null;
    const persona = id ? await this.prisma.persona.findUnique({ where: { idPersona: id } }) : null;
    if (!persona) throw new NotFoundException('El link no es válido');
    return persona;
  }
}
