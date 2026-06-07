import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { google, calendar_v3 } from 'googleapis';
import { Turno, Persona } from '@prisma/client';

/**
 * Servicio para integrar con Google Calendar API.
 * Maneja OAuth2, tokens, y sincronización de eventos.
 */
@Injectable()
export class GoogleCalendarService {
  private oauth2Client: InstanceType<typeof google.auth.OAuth2>;

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

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });
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
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token!,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        calendarId,
      },
    });

    this.oauth2Client.setCredentials(tokens);
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
      access_token: config.accessToken,
      refresh_token: config.refreshToken,
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
    };

    const response = await calendar.events.insert({
      calendarId: config.calendarId,
      requestBody: event,
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
      access_token: config.accessToken,
      refresh_token: config.refreshToken,
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
    };

    await calendar.events.update({
      calendarId: config.calendarId,
      eventId: turno.googleEventId,
      requestBody: event,
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
      access_token: config.accessToken,
      refresh_token: config.refreshToken,
    });

    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    await calendar.events.delete({
      calendarId: config.calendarId,
      eventId: googleEventId,
    });
  }
}
