import type { ProgresoTurno } from '../turnos/fidelizacion.util';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { POWERED_BY_NAME } from '../../common/constants/branding.constant';

export interface TurnoMailData {
  nombreCliente: string;
  fechaHoraInicio: Date;
  servicios: string[];
  direccion?: string | null;
  whatsappUrl?: string | null;
  /** Solo se pasa en la confirmación, no en el recordatorio (ver turnos.service.ts). */
  politicaReservas?: string | null;
  /** Nombre del negocio, para el encabezado del mail. Default si no hay config cargada. */
  nombreNegocio?: string | null;
  logoUrl?: string | null;
  /** Hex del color primario del negocio (personalizable desde el panel). Si no es un hex válido, se usa el dorado por default. */
  colorPrimario?: string | null;
  /** Link firmado para que el cliente cancele el turno él mismo (ver cancelacion-token.util.ts). */
  cancelarUrl?: string | null;
  /** Visitas del club de fidelización; null si el programa está apagado o el turno no suma. */
  fidelizacion?: ProgresoTurno | null;
  /** Cupón con el que se reservó (solo en la confirmación). */
  cupon?: { codigo: string; descuentoPorcentaje: number } | null;
}

/** Datos del aviso que recibe el barbero cuando un cliente cancela desde el link del mail. */
export interface AvisoCancelacionData {
  nombreCliente: string;
  telefonoCliente?: string | null;
  fechaHoraInicio: Date;
  canceladoEn: Date;
  servicios: string[];
  nombreNegocio?: string | null;
  colorPrimario?: string | null;
}

export interface AvisoNuevaReservaData {
  nombreCliente: string;
  telefonoCliente?: string | null;
  emailCliente?: string | null;
  fechaHoraInicio: Date;
  servicios: string[];
  formaPago?: string | null;
  observacion?: string | null;
  /** dd/mm, si el cliente la cargó. */
  cumpleanos?: string | null;
  cupon?: { codigo: string; descuentoPorcentaje: number } | null;
  clienteNuevo: boolean;
  /** Link a la agenda del panel; null si falta FRONTEND_URL. */
  panelUrl?: string | null;
  nombreNegocio?: string | null;
  colorPrimario?: string | null;
}

export interface CuponCumpleanosData {
  nombreCliente: string;
  codigo: string;
  descuentoPorcentaje: number;
  /** dd/mm */
  fechaCumple: string;
  /** dd/mm, último día para reservar con el cupón. */
  hasta: string;
  reservarUrl: string;
  /** Link para dejar de recibir promociones; null si falta FRONTEND_URL o JWT_SECRET. */
  bajaUrl: string | null;
  /** true = aviso de que el cupón está por vencer (en vez del regalo). */
  recordatorio?: boolean;
  nombreNegocio?: string | null;
  logoUrl?: string | null;
  colorPrimario?: string | null;
}

/** Los datos del cliente vienen del formulario público: se escapan antes de meterlos en el HTML. */
function escapeHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** "2 h 15 min", "40 min", "3 días y 2 h". */
function formatearAnticipacion(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const dias = Math.floor(totalMin / 1440);
  const horas = Math.floor((totalMin % 1440) / 60);
  const min = totalMin % 60;
  if (dias > 0) return horas > 0 ? `${dias} ${dias === 1 ? 'día' : 'días'} y ${horas} h` : `${dias} ${dias === 1 ? 'día' : 'días'}`;
  if (horas > 0) return min > 0 ? `${horas} h ${min} min` : `${horas} h`;
  return `${min} min`;
}

/**
 * Link de WhatsApp a partir del teléfono que cargó el cliente. Si ya trae
 * código de país (54...) se usa tal cual; si son 10 dígitos (área + número,
 * formato habitual en Argentina) se arma como celular argentino (549...).
 * En cualquier otro caso no se arma link y solo se muestra el número.
 */
function whatsappDeTelefono(telefono: string): string | null {
  const digitos = telefono.replace(/\D/g, '');
  if (digitos.startsWith('54') && digitos.length >= 12) return `https://wa.me/${digitos}`;
  if (digitos.length === 10) return `https://wa.me/549${digitos}`;
  return null;
}

const FECHA_TURNO_OPCIONES: Intl.DateTimeFormatOptions = {
  timeZone: 'America/Argentina/Buenos_Aires',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
};

/** Paleta y tipografía del tema "barber" (ver apps/frontend/tailwind.config.js), para que el mail se vea igual que el sitio. */
const MARCA = {
  primarioDefault: '#A9762F',
  neutral: '#1B1815',
  neutralContent: '#F6F1E7',
  base100: '#FBF8F2',
  base200: '#F2ECE0',
  base300: '#E4DAC6',
  textoSuave: '#8A8070',
  textoCuerpo: '#4A443C',
  fontDisplay: `'Fraunces', Georgia, 'Times New Roman', serif`,
  fontSans: `'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    // El constructor de Resend tira una excepción si no recibe API key, lo
    // que tumbaría el arranque de toda la app (dev sin key configurada,
    // o cualquier test e2e que instancie AuthModule). Por eso queda en null
    // hasta que haya una key real, en vez de construirlo siempre.
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.from = this.configService.get<string>('MAIL_FROM') ?? 'onboarding@resend.dev';
  }

  /**
   * No relanza errores de envío: forgot-password siempre responde con un
   * mensaje genérico, así que un fallo de Resend solo se loguea acá para
   * poder diagnosticarlo, sin filtrar nada distinto hacia el cliente.
   */
  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    if (!this.resend) {
      this.logger.warn(`RESEND_API_KEY no configurada: no se envió el email de reset a ${to}`);
      return;
    }

    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject: 'Restablecer tu contraseña',
      html: `
        <p>Recibimos una solicitud para restablecer tu contraseña.</p>
        <p><a href="${resetUrl}">Hacé clic acá para elegir una nueva contraseña</a></p>
        <p>Este enlace vence en 30 minutos. Si no solicitaste esto, podés ignorar este email.</p>
      `,
    });

    if (error) {
      this.logger.error(`Fallo al enviar email de reset a ${to}: ${JSON.stringify(error)}`);
    }
  }

  /**
   * Código de verificación en dos pasos del login. No relanza errores (mismo
   * motivo que el resto de esta clase), pero el login necesita saber si
   * realmente se mandó: si falla, no tiene sentido dejar al usuario esperando
   * un código que nunca va a llegar.
   */
  async sendTwoFactorCode(to: string, code: string): Promise<boolean> {
    if (!this.resend) {
      this.logger.warn(`RESEND_API_KEY no configurada: no se envió el código 2FA a ${to}`);
      return false;
    }

    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject: 'Tu código de verificación',
      html: `
        <!doctype html>
        <html lang="es">
        <head><meta charset="utf-8"></head>
        <body style="margin:0;padding:0;background-color:${MARCA.base200};font-family:${MARCA.fontSans};">
          <div style="padding:32px 16px;">
            <table role="presentation" width="100%" style="max-width:420px;margin:0 auto;border-collapse:collapse;">
              <tr>
                <td style="background-color:${MARCA.base100};border:1px solid ${MARCA.base300};border-radius:12px;padding:32px;text-align:center;">
                  <p style="margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${MARCA.primarioDefault};">Verificación de ingreso</p>
                  <p style="margin:0 0 20px;font-size:14px;color:${MARCA.textoCuerpo};">Usá este código para completar el inicio de sesión:</p>
                  <div style="font-size:34px;font-weight:700;letter-spacing:0.12em;color:${MARCA.neutral};margin-bottom:20px;">${code}</div>
                  <p style="margin:0;font-size:12px;color:${MARCA.textoSuave};">Vence en 10 minutos. Si no fuiste vos, ignorá este mensaje.</p>
                  <p style="margin:18px 0 0;font-size:11px;color:${MARCA.textoSuave};opacity:0.7;">Powered by ${POWERED_BY_NAME}</p>
                </td>
              </tr>
            </table>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      this.logger.error(`Fallo al enviar código 2FA a ${to}: ${JSON.stringify(error)}`);
      return false;
    }

    return true;
  }

  /** Se manda apenas se crea el turno (admin o reserva pública). Silencioso: nunca debe hacer fallar la creación del turno. */
  async sendTurnoConfirmacion(to: string, data: TurnoMailData): Promise<void> {
    await this.enviarTurnoMail(to, {
      subject: '¡Turno confirmado!',
      eyebrow: 'Reserva confirmada',
      titulo: `¡Listo, ${data.nombreCliente}!`,
      intro: 'Tu turno quedó registrado. Te esperamos.',
      data,
    });
  }

  /**
   * Se manda desde el cron de recordatorios. Nunca tira excepción (mismo motivo
   * que el resto de esta clase), pero a diferencia de la confirmación, el cron
   * necesita saber si realmente se mandó: solo así puede decidir si marca el
   * turno como notificado o lo deja para reintentar en la próxima corrida.
   */
  async sendTurnoRecordatorio(to: string, data: TurnoMailData): Promise<boolean> {
    return this.enviarTurnoMail(to, {
      subject: 'Recordatorio de tu turno',
      eyebrow: 'Recordatorio',
      titulo: `Hola ${data.nombreCliente}, te esperamos pronto`,
      intro: 'Te recordamos el turno que tenés agendado.',
      data,
    });
  }

  /**
   * Aviso al barbero cuando un cliente cancela desde el link del mail, para que
   * sepa que el horario quedó libre y pueda ofrecerlo. Devuelve si se mandó;
   * nunca tira excepción (la cancelación ya está hecha, esto es best-effort).
   */
  async sendAvisoCancelacion(to: string[], data: AvisoCancelacionData): Promise<boolean> {
    if (to.length === 0) return false;
    if (!this.resend) {
      this.logger.warn(`RESEND_API_KEY no configurada: no se envió el aviso de cancelación a ${to.join(', ')}`);
      return false;
    }

    const color = this.colorPrimario(data);
    const nombreNegocio = escapeHtml(data.nombreNegocio || 'Tu negocio');
    const cliente = escapeHtml(data.nombreCliente);
    const fecha = data.fechaHoraInicio.toLocaleString('es-AR', FECHA_TURNO_OPCIONES);
    const anticipacion = formatearAnticipacion(data.fechaHoraInicio.getTime() - data.canceladoEn.getTime());
    const telefono = data.telefonoCliente ? escapeHtml(data.telefonoCliente) : null;
    const whatsapp = data.telefonoCliente ? whatsappDeTelefono(data.telefonoCliente) : null;

    const fila = (label: string, valor: string) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid ${MARCA.base300};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${MARCA.textoSuave};width:120px;vertical-align:top;">${label}</td>
        <td style="padding:12px 0;border-bottom:1px solid ${MARCA.base300};font-size:15px;color:${MARCA.neutral};vertical-align:top;">${valor}</td>
      </tr>`;

    const subject = `Turno cancelado: ${data.nombreCliente} · ${fecha}`;
    const html = `
      <!doctype html>
      <html lang="es">
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body style="margin:0;padding:0;">
      <div style="background-color:${MARCA.base200};padding:32px 16px;font-family:${MARCA.fontSans};">
        <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;border-collapse:collapse;">
          <tr>
            <td style="background-color:${MARCA.base100};border:1px solid ${MARCA.base300};border-radius:12px;padding:32px;">
              <p style="margin:0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${color};">Turno cancelado por el cliente</p>
              <h1 style="font-family:${MARCA.fontDisplay};font-size:22px;font-weight:600;color:${MARCA.neutral};margin:10px 0 6px;">${cliente} canceló su turno</h1>
              <p style="font-size:15px;color:${MARCA.textoCuerpo};margin:0 0 20px;line-height:1.5;">El horario ya quedó libre para que otro cliente lo reserve desde la web.</p>
              <table role="presentation" width="100%" style="border-collapse:collapse;border-top:1px solid ${MARCA.base300};">
                ${fila('Turno', fecha)}
                ${fila('Servicios', escapeHtml(data.servicios.join(', ')))}
                ${fila('Anticipación', `Canceló ${anticipacion} antes`)}
                ${telefono ? fila('Teléfono', telefono) : ''}
              </table>
              ${whatsapp ? `
              <div style="padding:24px 0 0;text-align:center;">
                <a href="${whatsapp}" style="display:inline-block;background-color:#25D366;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 26px;border-radius:8px;">Escribirle por WhatsApp</a>
              </div>` : ''}
              <p style="margin:24px 0 0;font-size:11px;color:${MARCA.textoSuave};text-align:center;">${nombreNegocio} · Powered by ${POWERED_BY_NAME}</p>
            </td>
          </tr>
        </table>
      </div>
      </body>
      </html>
    `;

    const { error } = await this.resend.emails.send({ from: this.from, to, subject, html });
    if (error) {
      this.logger.error(`Fallo al enviar aviso de cancelación a ${to.join(', ')}: ${JSON.stringify(error)}`);
      return false;
    }
    return true;
  }

  /**
   * Aviso al negocio de un turno que el cliente sacó desde la web. Devuelve
   * si se mandó; nunca tira excepción (el turno ya está creado, esto es
   * best-effort).
   */
  async sendAvisoNuevaReserva(to: string[], data: AvisoNuevaReservaData): Promise<boolean> {
    if (to.length === 0) return false;
    if (!this.resend) {
      this.logger.warn(`RESEND_API_KEY no configurada: no se envió el aviso de nueva reserva a ${to.join(', ')}`);
      return false;
    }

    const color = this.colorPrimario(data);
    const nombreNegocio = escapeHtml(data.nombreNegocio || 'Tu negocio');
    const cliente = escapeHtml(data.nombreCliente);
    const fecha = data.fechaHoraInicio.toLocaleString('es-AR', FECHA_TURNO_OPCIONES);
    const whatsapp = data.telefonoCliente ? whatsappDeTelefono(data.telefonoCliente) : null;

    const fila = (label: string, valor: string) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid ${MARCA.base300};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${MARCA.textoSuave};width:120px;vertical-align:top;">${label}</td>
        <td style="padding:12px 0;border-bottom:1px solid ${MARCA.base300};font-size:15px;color:${MARCA.neutral};vertical-align:top;">${valor}</td>
      </tr>`;

    const boton = (href: string, texto: string, fondo: string) =>
      `<a href="${href}" style="display:inline-block;margin:4px;background-color:${fondo};color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 26px;border-radius:8px;">${texto}</a>`;

    const subject = `Nuevo turno: ${data.nombreCliente} · ${fecha}`;
    const html = `
      <!doctype html>
      <html lang="es">
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body style="margin:0;padding:0;">
      <div style="background-color:${MARCA.base200};padding:32px 16px;font-family:${MARCA.fontSans};">
        <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;border-collapse:collapse;">
          <tr>
            <td style="background-color:${MARCA.base100};border:1px solid ${MARCA.base300};border-radius:12px;padding:32px;">
              <p style="margin:0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${color};">Nuevo turno desde la web</p>
              <h1 style="font-family:${MARCA.fontDisplay};font-size:22px;font-weight:600;color:${MARCA.neutral};margin:10px 0 6px;">${cliente} sacó un turno</h1>
              <p style="font-size:15px;color:${MARCA.textoCuerpo};margin:0 0 20px;line-height:1.5;">${data.clienteNuevo ? 'Es un cliente nuevo: quedó cargado en Clientes.' : 'Ya era cliente.'} El turno ya figura confirmado en la agenda.</p>
              <table role="presentation" width="100%" style="border-collapse:collapse;border-top:1px solid ${MARCA.base300};">
                ${fila('Turno', fecha)}
                ${fila('Servicios', escapeHtml(data.servicios.join(', ')))}
                ${data.formaPago ? fila('Va a pagar con', escapeHtml(data.formaPago)) : ''}
                ${data.cupon ? fila('Cupón', `${escapeHtml(data.cupon.codigo)} (${Number(data.cupon.descuentoPorcentaje.toFixed(2))}% de descuento)`) : ''}
                ${data.telefonoCliente ? fila('Teléfono', escapeHtml(data.telefonoCliente)) : ''}
                ${data.emailCliente ? fila('Email', escapeHtml(data.emailCliente)) : ''}
                ${data.cumpleanos ? fila('Cumpleaños', escapeHtml(data.cumpleanos)) : ''}
                ${data.observacion ? fila('Notas', escapeHtml(data.observacion)) : ''}
              </table>
              ${whatsapp || data.panelUrl ? `
              <div style="padding:24px 0 0;text-align:center;">
                ${data.panelUrl ? boton(data.panelUrl, 'Ver la agenda', color) : ''}
                ${whatsapp ? boton(whatsapp, 'Escribirle por WhatsApp', '#25D366') : ''}
              </div>` : ''}
              <p style="margin:24px 0 0;font-size:11px;color:${MARCA.textoSuave};text-align:center;">${nombreNegocio} · Powered by ${POWERED_BY_NAME}</p>
            </td>
          </tr>
        </table>
      </div>
      </body>
      </html>
    `;

    const { error } = await this.resend.emails.send({ from: this.from, to, subject, html });
    if (error) {
      this.logger.error(`Fallo al enviar aviso de nueva reserva a ${to.join(', ')}: ${JSON.stringify(error)}`);
      return false;
    }
    return true;
  }

  /** Cuántas visitas lleva el cliente en el club, o si este turno ya tiene el descuento. */
  private bloqueFidelizacion(f: ProgresoTurno, color: string): string {
    const pct = `${Number(f.descuentoPorcentaje.toFixed(2))}%`;
    const faltan = f.visitasRequeridas - f.visitaEnCiclo;
    const titulo = f.conDescuento ? `¡Este turno tiene ${pct} de descuento!` : `Visita ${f.visitaEnCiclo} de ${f.visitasRequeridas} del club`;
    const texto = f.conDescuento
      ? `Es tu visita ${f.visitasRequeridas} del club: el descuento se aplica al cobrar.`
      : `Te ${faltan === 1 ? 'falta 1 visita' : `faltan ${faltan} visitas`} para tu ${pct} de descuento.`;
    const aclaracion = f.cuentaTurnosPendientes ? ' Contamos los turnos que ya tenés reservados antes de este.' : '';

    // Puntitos de progreso; con muchas visitas por ciclo se omiten para no romper el ancho del mail.
    const puntos =
      f.visitasRequeridas <= 12
        ? `<div style="margin-top:10px;">${Array.from({ length: f.visitasRequeridas }, (_, i) => {
            const lleno = f.conDescuento || i < f.visitaEnCiclo;
            return `<span style="display:inline-block;width:14px;height:14px;margin:0 4px 0 0;border-radius:50%;background-color:${lleno ? color : MARCA.base300};"></span>`;
          }).join('')}</div>`
        : '';

    return `
              <div style="margin:24px 32px 0;padding:16px 18px;background-color:${MARCA.base200};border-left:3px solid ${color};border-radius:0 6px 6px 0;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${color};">Club de fidelización</p>
                <p style="margin:0;font-size:16px;font-weight:700;color:${MARCA.neutral};">${titulo}</p>
                <p style="margin:4px 0 0;font-size:13px;color:${MARCA.textoCuerpo};line-height:1.5;">${texto}${aclaracion}</p>
                ${puntos}
              </div>`;
  }

  /** Regalo de cumpleaños: cupón personal con botón para reservar. Devuelve si se mandó. */
  async sendCuponCumpleanos(to: string, data: CuponCumpleanosData): Promise<boolean> {
    if (!this.resend) {
      this.logger.warn(`RESEND_API_KEY no configurada: no se envió el cupón de cumpleaños a ${to}`);
      return false;
    }

    const color = this.colorPrimario(data);
    const nombreNegocio = escapeHtml(data.nombreNegocio || 'Tu barbería');
    const nombre = escapeHtml(data.nombreCliente);
    const pct = `${Number(data.descuentoPorcentaje.toFixed(2))}%`;
    const subject = data.recordatorio
      ? `${data.nombreCliente}, tu regalo de cumple vence el ${data.hasta}`
      : `¡Feliz cumple, ${data.nombreCliente}! Te regalamos ${pct} de descuento`;
    const eyebrow = data.recordatorio ? 'Tu regalo vence pronto' : 'Regalo de cumpleaños';
    const titulo = data.recordatorio ? `${nombre}, no te olvides de tu regalo` : `¡Feliz cumple, ${nombre}! 🎉`;
    const intro = data.recordatorio
      ? `Todavía tenés <strong>${pct} de descuento</strong> por tu cumple. Reservá hasta el <strong>${data.hasta}</strong> para usarlo.`
      : `Para festejar tu cumple (${data.fechaCumple}) te regalamos <strong>${pct} de descuento</strong> en tu próximo turno.`;

    const html = `
      <!doctype html>
      <html lang="es">
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body style="margin:0;padding:0;">
      <div style="background-color:${MARCA.base200};padding:32px 16px;font-family:${MARCA.fontSans};">
        <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;border-collapse:collapse;">
          <tr>
            <td style="background-color:${MARCA.base100};border:1px solid ${MARCA.base300};border-radius:12px;overflow:hidden;">
              <table role="presentation" width="100%" style="border-collapse:collapse;">
                <tr>
                  <td style="background-color:${MARCA.neutral};padding:28px 32px;text-align:center;">
                    ${data.logoUrl ? `<img src="${data.logoUrl}" alt="${nombreNegocio}" height="36" style="max-height:36px;margin-bottom:10px;" />` : ''}
                    <div style="font-family:${MARCA.fontDisplay};font-size:21px;font-weight:600;color:${MARCA.neutralContent};">${nombreNegocio}</div>
                  </td>
                </tr>
              </table>

              <div style="padding:32px 32px 8px;text-align:center;">
                <p style="margin:0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${color};">${eyebrow}</p>
                <h1 style="font-family:${MARCA.fontDisplay};font-size:26px;font-weight:600;color:${MARCA.neutral};margin:10px 0 8px;">${titulo}</h1>
                <p style="font-size:15px;color:${MARCA.textoCuerpo};margin:0;line-height:1.5;">${intro}</p>
              </div>

              <div style="margin:24px 32px 0;padding:20px;border:2px dashed ${color};border-radius:10px;text-align:center;background-color:${MARCA.base200};">
                <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${MARCA.textoSuave};">Tu código</p>
                <p style="margin:0;font-family:monospace;font-size:24px;font-weight:700;letter-spacing:0.06em;color:${MARCA.neutral};">${escapeHtml(data.codigo)}</p>
                <p style="margin:8px 0 0;font-size:13px;color:${MARCA.textoCuerpo};">Reservá hasta el <strong>${data.hasta}</strong>. Es personal y se usa una vez.</p>
              </div>

              <div style="padding:24px 32px 4px;text-align:center;">
                <a href="${data.reservarUrl}" style="display:inline-block;background-color:${color};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 30px;border-radius:8px;">Reservar con mi descuento</a>
                <p style="margin:10px 0 0;font-size:12px;color:${MARCA.textoSuave};">El código ya va cargado. No se suma a otros descuentos: si te toca uno mayor, queda ese.</p>
              </div>

              <div style="padding:28px 32px 32px;text-align:center;">
                <p style="margin:0;font-size:12px;color:${MARCA.textoSuave};">${nombreNegocio}</p>
                ${data.bajaUrl ? `<p style="margin:8px 0 0;font-size:11px;color:${MARCA.textoSuave};">¿No querés recibir más promociones? <a href="${data.bajaUrl}" style="color:${MARCA.textoSuave};">Darme de baja</a></p>` : ''}
                <p style="margin:6px 0 0;font-size:11px;color:${MARCA.textoSuave};opacity:0.7;">Powered by ${POWERED_BY_NAME}</p>
              </div>
            </td>
          </tr>
        </table>
      </div>
      </body>
      </html>
    `;

    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject,
      html,
      // Para que Gmail y otros muestren su propio botón de "desuscribirse".
      headers: data.bajaUrl ? { 'List-Unsubscribe': `<${data.bajaUrl}>` } : undefined,
    });
    if (error) {
      this.logger.error(`Fallo al enviar el cupón de cumpleaños a ${to}: ${JSON.stringify(error)}`);
      return false;
    }
    return true;
  }

  private colorPrimario(data: { colorPrimario?: string | null }): string {
    return data.colorPrimario && /^#[0-9a-fA-F]{6}$/.test(data.colorPrimario)
      ? data.colorPrimario
      : MARCA.primarioDefault;
  }

  private async enviarTurnoMail(
    to: string,
    opts: { subject: string; eyebrow: string; titulo: string; intro: string; data: TurnoMailData },
  ): Promise<boolean> {
    const { subject, eyebrow, titulo, intro, data } = opts;

    if (!this.resend) {
      this.logger.warn(`RESEND_API_KEY no configurada: no se envió "${subject}" a ${to}`);
      return false;
    }

    const fecha = data.fechaHoraInicio.toLocaleString('es-AR', FECHA_TURNO_OPCIONES);

    const nombreNegocio = data.nombreNegocio || 'Tu turno';
    const color = this.colorPrimario(data);

    const fila = (label: string, valor: string) => `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid ${MARCA.base300};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${MARCA.textoSuave};width:110px;vertical-align:top;">${label}</td>
        <td style="padding:14px 0;border-bottom:1px solid ${MARCA.base300};font-size:15px;color:${MARCA.neutral};vertical-align:top;">${valor}</td>
      </tr>`;

    const html = `
      <!doctype html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${subject}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Manrope:wght@400;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin:0;padding:0;">
      <div style="background-color:${MARCA.base200};padding:32px 16px;font-family:${MARCA.fontSans};">
        <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;border-collapse:collapse;">
          <tr>
            <td style="background-color:${MARCA.base100};border:1px solid ${MARCA.base300};border-radius:12px;overflow:hidden;">

              <table role="presentation" width="100%" style="border-collapse:collapse;">
                <tr>
                  <td style="background-color:${MARCA.neutral};padding:28px 32px;text-align:center;">
                    ${data.logoUrl ? `<img src="${data.logoUrl}" alt="${nombreNegocio}" height="36" style="max-height:36px;margin-bottom:10px;" />` : ''}
                    <div style="font-family:${MARCA.fontDisplay};font-size:21px;font-weight:600;color:${MARCA.neutralContent};letter-spacing:0.01em;">${nombreNegocio}</div>
                  </td>
                </tr>
              </table>

              <div style="padding:32px 32px 4px;">
                <p style="margin:0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${color};">${eyebrow}</p>
                <h1 style="font-family:${MARCA.fontDisplay};font-size:24px;font-weight:600;color:${MARCA.neutral};margin:10px 0 6px;">${titulo}</h1>
                <p style="font-size:15px;color:${MARCA.textoCuerpo};margin:0 0 20px;line-height:1.5;">${intro}</p>
              </div>

              <div style="padding:0 32px;">
                <table role="presentation" width="100%" style="border-collapse:collapse;border-top:1px solid ${MARCA.base300};">
                  ${fila('Fecha', fecha)}
                  ${fila('Servicios', data.servicios.join(', '))}
                  ${data.direccion ? fila('Dirección', data.direccion) : ''}
                  ${data.cupon ? fila('Descuento', `${Number(data.cupon.descuentoPorcentaje.toFixed(2))}% con el cupón ${escapeHtml(data.cupon.codigo)}`) : ''}
                </table>
              </div>

              ${data.fidelizacion ? this.bloqueFidelizacion(data.fidelizacion, color) : ''}

              ${data.whatsappUrl ? `
              <div style="padding:24px 32px 4px;text-align:center;">
                <a href="${data.whatsappUrl}" style="display:inline-block;background-color:#25D366;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 26px;border-radius:8px;">${data.cancelarUrl ? '¿Querés cambiar el horario? Escribinos por WhatsApp' : '¿Modificar o cancelar? Escribinos por WhatsApp'}</a>
              </div>` : ''}

              ${data.cancelarUrl ? `
              <div style="padding:16px 32px 4px;text-align:center;">
                <p style="margin:0 0 8px;font-size:13px;color:${MARCA.textoCuerpo};">¿No vas a poder venir? Avisanos así liberamos el horario.</p>
                <a href="${data.cancelarUrl}" style="display:inline-block;color:${MARCA.neutral};text-decoration:none;font-weight:700;font-size:14px;padding:10px 22px;border:1px solid ${MARCA.base300};border-radius:8px;background-color:#ffffff;">Cancelar turno</a>
              </div>` : ''}

              ${data.politicaReservas ? `
              <div style="margin:24px 32px 8px;padding:16px 18px;background-color:${MARCA.base200};border-left:3px solid ${color};border-radius:0 6px 6px 0;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${color};">Política de reservas</p>
                <p style="margin:0;font-size:13px;color:${MARCA.textoCuerpo};line-height:1.5;">${data.politicaReservas}</p>
              </div>` : ''}

              <div style="padding:28px 32px 32px;text-align:center;">
                <p style="margin:0;font-size:12px;color:${MARCA.textoSuave};">${nombreNegocio}${data.direccion ? ` · ${data.direccion}` : ''}</p>
                <p style="margin:6px 0 0;font-size:11px;color:${MARCA.textoSuave};opacity:0.7;">Powered by ${POWERED_BY_NAME}</p>
              </div>

            </td>
          </tr>
        </table>
      </div>
      </body>
      </html>
    `;

    const { error } = await this.resend.emails.send({ from: this.from, to, subject, html });

    if (error) {
      this.logger.error(`Fallo al enviar "${subject}" a ${to}: ${JSON.stringify(error)}`);
      return false;
    }

    return true;
  }
}
