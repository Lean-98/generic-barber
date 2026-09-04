import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { google, calendar_v3 } from 'googleapis';
import { Turno, Persona } from '@prisma/client';
import { randomBytes, timingSafeEqual } from 'crypto';
import { encrypt, decrypt } from '../../common/utils/crypto.util';

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutos para completar el flow

/**
 * Servicio para integrar con Google Calendar API.
 * Maneja OAuth2, tokens, y sincronización de eventos.
 */
@Injectable()
export class GoogleCalendarService {
  private oauth2Client: InstanceType<typeof google.auth.OAuth2>;
  // El callback de OAuth es público por naturaleza del protocolo (Google
  // redirige el navegador sin credenciales de la app). Sin un `state` que
  // ligue el callback al flow que nosotros iniciamos, cualquiera puede armar
  // su propio flow OAuth con nuestro client_id (no es secreto), conseguir un
  // `code` de SU propia cuenta, y lograr que alguien visite
  // /callback?code=... para secuestrar la conexión hacia su cuenta.
  private pendingState: { valor: string; expira: number } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.configService.get<string>('GOOGLE_REDIRECT_URI');

    if (clientId && clientSecret && redirectUri) {
      this.oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri,
      );
    }
  }

  /**
   * Verifica si la integración está configurada.
   */
  isConfigured(): boolean {
    return !!this.oauth2Client;
  }

  /**
   * Genera la URL de autorización OAuth2.
   */
  getAuthUrl(): string {
    if (!this.isConfigured()) {
      throw new BadRequestException('Google Calendar no está configurado');
    }

    const scopes = ['https://www.googleapis.com/auth/calendar'];
    const state = randomBytes(24).toString('hex');
    this.pendingState = { valor: state, expira: Date.now() + STATE_TTL_MS };

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state,
    });
  }

  /**
   * Valida el `state` recibido en el callback contra el que generamos al
   * armar la URL de autorización. Se consume: solo sirve una vez.
   */
  verificarState(state: string | undefined): void {
    const pendiente = this.pendingState;
    this.pendingState = null;

    if (!state || !pendiente || Date.now() > pendiente.expira) {
      throw new BadRequestException('El enlace de autorización expiró o es inválido, intentá conectar de nuevo');
    }

    const a = Buffer.from(state);
    const b = Buffer.from(pendiente.valor);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new BadRequestException('El enlace de autorización expiró o es inválido, intentá conectar de nuevo');
    }
  }

  /**
   * Intercambia el código de autorización por tokens y guarda la configuración.
   */
  async connect(code: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new BadRequestException('Google Calendar no está configurado');
    }

    const { tokens } = await this.oauth2Client.getToken(code);

    const calendarId = this.configService.get<string>('GOOGLE_CALENDAR_ID') || 'primary';

    await this.prisma.googleCalendarConfig.deleteMany();
    await this.prisma.googleCalendarConfig.create({
      data: {
        accessToken: this.cifrarToken(tokens.access_token!),
        refreshToken: this.cifrarToken(tokens.refresh_token!),
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        calendarId,
      },
    });

    this.oauth2Client.setCredentials(tokens);
  }

  /**
   * Los tokens de Google dan acceso de larga duración al calendario del
   * negocio; se guardan cifrados en la base (no en texto plano) para que
   * filtrarse la DB no signifique automáticamente filtrarse las credenciales
   * de Google. La clave se deriva de JWT_SECRET para no requerir una env var
   * nueva.
   */
  private cifrarToken(token: string): string {
    return encrypt(token, this.getClaveCifrado());
  }

  private descifrarToken(token: string): string {
    return decrypt(token, this.getClaveCifrado());
  }

  // Sin JWT_SECRET no hay clave: mejor fallar fuerte acá que cifrar en
  // silencio con una clave derivada de string vacío (predecible por
  // cualquiera que lea este archivo).
  private getClaveCifrado(): string {
    const secreto = this.configService.get<string>('JWT_SECRET');
    if (!secreto) {
      throw new Error('JWT_SECRET no está configurado: no se puede cifrar/descifrar el token de Google Calendar');
    }
    return secreto;
  }

  /**
   * Desconecta Google Calendar (elimina tokens guardados).
   */
  async disconnect(): Promise<void> {
    await this.prisma.googleCalendarConfig.deleteMany();
  }

  /**
   * Verifica si hay una conexión activa.
   */
  async isConnected(): Promise<boolean> {
    const config = await this.prisma.googleCalendarConfig.findFirst();
    return !!config;
  }

  /**
   * Obtiene la configuración actual.
   */
  async getConfig() {
    const config = await this.prisma.googleCalendarConfig.findFirst();
    if (!config) {
      throw new NotFoundException('Google Calendar no está conectado');
    }
    return {
      calendarId: config.calendarId,
      connected: true,
    };
  }

  /**
   * Crea un evento en Google Calendar para un turno.
   */
  async createEvent(turno: Turno & { persona: Persona }): Promise<string | null> {
    const config = await this.prisma.googleCalendarConfig.findFirst();
    if (!config || !this.isConfigured()) {
      return null;
    }

    this.oauth2Client.setCredentials({
      access_token: this.descifrarToken(config.accessToken),
      refresh_token: this.descifrarToken(config.refreshToken),
    });

    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    const event: calendar_v3.Schema$Event = {
      summary: `Turno: ${turno.persona.nombre} ${turno.persona.apellido}`,
      description: turno.observacion || 'Turno de peluquería',
      start: {
        dateTime: turno.fechaHoraInicio.toISOString(),
        timeZone: 'America/Argentina/Buenos_Aires',
      },
      end: {
        dateTime: turno.fechaHoraFin.toISOString(),
        timeZone: 'America/Argentina/Buenos_Aires',
      },
      attendees: turno.persona.mail ? [{ email: turno.persona.mail }] : undefined,
    };

    const response = await calendar.events.insert({
      calendarId: config.calendarId,
      requestBody: event,
      sendUpdates: 'all',
    });

    return response.data.id || null;
  }

  /**
   * Actualiza un evento existente en Google Calendar.
   */
  async updateEvent(turno: Turno & { persona: Persona }): Promise<void> {
    if (!turno.googleEventId) {
      return;
    }

    const config = await this.prisma.googleCalendarConfig.findFirst();
    if (!config || !this.isConfigured()) {
      return;
    }

    this.oauth2Client.setCredentials({
      access_token: this.descifrarToken(config.accessToken),
      refresh_token: this.descifrarToken(config.refreshToken),
    });

    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    const event: calendar_v3.Schema$Event = {
      summary: `Turno: ${turno.persona.nombre} ${turno.persona.apellido}`,
      description: turno.observacion || 'Turno de peluquería',
      start: {
        dateTime: turno.fechaHoraInicio.toISOString(),
        timeZone: 'America/Argentina/Buenos_Aires',
      },
      end: {
        dateTime: turno.fechaHoraFin.toISOString(),
        timeZone: 'America/Argentina/Buenos_Aires',
      },
      attendees: turno.persona.mail ? [{ email: turno.persona.mail }] : undefined,
    };

    await calendar.events.update({
      calendarId: config.calendarId,
      eventId: turno.googleEventId,
      requestBody: event,
      sendUpdates: 'all',
    });
  }

  /**
   * Elimina un evento de Google Calendar.
   */
  async deleteEvent(googleEventId: string): Promise<void> {
    const config = await this.prisma.googleCalendarConfig.findFirst();
    if (!config || !this.isConfigured()) {
      return;
    }

    this.oauth2Client.setCredentials({
      access_token: this.descifrarToken(config.accessToken),
      refresh_token: this.descifrarToken(config.refreshToken),
    });

    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    await calendar.events.delete({
      calendarId: config.calendarId,
      eventId: googleEventId,
      sendUpdates: 'all',
    });
  }
}
