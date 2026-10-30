import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface TurnoMailData {
  nombreCliente: string;
  fechaHoraInicio: Date;
  servicios: string[];
  direccion?: string | null;
  whatsappUrl?: string | null;
}

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
    await this.enviarTurnoMail(to, '¡Turno confirmado!', `Hola ${data.nombreCliente}, tu turno quedó registrado.`, data);
  }

  /** Se manda desde el cron de recordatorios, con la anticipación configurada en el negocio. Silencioso por el mismo motivo. */
  async sendTurnoRecordatorio(to: string, data: TurnoMailData): Promise<void> {
    await this.enviarTurnoMail(to, 'Recordatorio de tu turno', `Hola ${data.nombreCliente}, te recordamos tu turno.`, data);
  }

  private async enviarTurnoMail(to: string, subject: string, intro: string, data: TurnoMailData): Promise<void> {
    if (!this.resend) {
      this.logger.warn(`RESEND_API_KEY no configurada: no se envió "${subject}" a ${to}`);
      return;
    }

    const fecha = data.fechaHoraInicio.toLocaleString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });

    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject,
      html: `
        <p>${intro}</p>
        <p><strong>Fecha:</strong> ${fecha}</p>
        <p><strong>Servicios:</strong> ${data.servicios.join(', ')}</p>
        ${data.direccion ? `<p><strong>Dirección:</strong> ${data.direccion}</p>` : ''}
        ${data.whatsappUrl ? `<p>Si necesitás modificar o cancelar tu turno, escribinos por <a href="${data.whatsappUrl}">WhatsApp</a>.</p>` : ''}
      `,
    });

    if (error) {
      this.logger.error(`Fallo al enviar "${subject}" a ${to}: ${JSON.stringify(error)}`);
    }
  }
}
