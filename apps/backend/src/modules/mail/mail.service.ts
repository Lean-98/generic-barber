import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

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
}

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

  private colorPrimario(data: TurnoMailData): string {
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

    const fecha = data.fechaHoraInicio.toLocaleString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });

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
                </table>
              </div>

              ${data.whatsappUrl ? `
              <div style="padding:24px 32px 4px;text-align:center;">
                <a href="${data.whatsappUrl}" style="display:inline-block;background-color:#25D366;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 26px;border-radius:8px;">¿Modificar o cancelar? Escribinos por WhatsApp</a>
              </div>` : ''}

              ${data.politicaReservas ? `
              <div style="margin:24px 32px 8px;padding:16px 18px;background-color:${MARCA.base200};border-left:3px solid ${color};border-radius:0 6px 6px 0;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${color};">Política de reservas</p>
                <p style="margin:0;font-size:13px;color:${MARCA.textoCuerpo};line-height:1.5;">${data.politicaReservas}</p>
              </div>` : ''}

              <div style="padding:28px 32px 32px;text-align:center;">
                <p style="margin:0;font-size:12px;color:${MARCA.textoSuave};">${nombreNegocio}${data.direccion ? ` · ${data.direccion}` : ''}</p>
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
