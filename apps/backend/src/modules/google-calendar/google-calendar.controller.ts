import { Controller, Get, Post, Delete, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GoogleCalendarService } from './google-calendar.service';

@ApiTags('Google Calendar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('google-calendar')
export class GoogleCalendarController {
  constructor(private readonly googleCalendarService: GoogleCalendarService) {}

  @Get('status')
  @ApiOperation({ summary: 'Verificar estado de la conexión con Google Calendar' })
  @ApiResponse({ status: 200, description: 'Estado de la conexión' })
  async getStatus() {
    const connected = await this.googleCalendarService.isConnected();
    const configured = this.googleCalendarService.isConfigured();

    if (!configured) {
      return {
        configured: false,
        connected: false,
        message: 'Google Calendar no está configurado. Falta GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET o GOOGLE_REDIRECT_URI.',
      };
    }

    if (!connected) {
      return {
        configured: true,
        connected: false,
        authUrl: this.googleCalendarService.getAuthUrl(),
        message: 'Google Calendar está configurado pero no conectado. Use la URL de autorización para conectar.',
      };
    }

    const config = await this.googleCalendarService.getConfig();
    return {
      configured: true,
      connected: true,
      calendarId: config.calendarId,
    };
  }

  @Get('auth-url')
  @ApiOperation({ summary: 'Obtener URL de autorización de Google Calendar' })
  @ApiResponse({ status: 200, description: 'URL de autorización' })
  @ApiResponse({ status: 400, description: 'Google Calendar no está configurado' })
  async getAuthUrl() {
    return {
      authUrl: this.googleCalendarService.getAuthUrl(),
    };
  }

  @Post('connect')
  @ApiOperation({ summary: 'Conectar Google Calendar con código de autorización' })
  @ApiResponse({ status: 200, description: 'Conectado exitosamente' })
  @ApiResponse({ status: 400, description: 'Código inválido o Google Calendar no configurado' })
  @ApiQuery({ name: 'code', description: 'Código de autorización de Google OAuth2' })
  async connect(@Query('code') code: string) {
    if (!code) {
      throw new BadRequestException('El código de autorización es requerido');
    }

    await this.googleCalendarService.connect(code);

    return {
      message: 'Google Calendar conectado exitosamente',
      connected: true,
    };
  }

  @Delete('disconnect')
  @ApiOperation({ summary: 'Desconectar Google Calendar' })
  @ApiResponse({ status: 200, description: 'Desconectado exitosamente' })
  async disconnect() {
    await this.googleCalendarService.disconnect();

    return {
      message: 'Google Calendar desconectado exitosamente',
      connected: false,
    };
  }
}
