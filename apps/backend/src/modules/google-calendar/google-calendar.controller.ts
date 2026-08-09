import { Controller, Get, Post, Delete, Query, Res, UseGuards, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiExcludeEndpoint, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
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

  @Get('callback')
  @ApiExcludeEndpoint()
  @Public()
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    if (error) {
      return res.status(400).send(this.callbackHtml(false, error));
    }

    if (!code) {
      return res.status(400).send(this.callbackHtml(false, 'No se recibió el código de autorización'));
    }

    try {
      // Verifica que este callback corresponda al flow que nosotros iniciamos
      // (ver comentario en GoogleCalendarService sobre el riesgo de CSRF acá).
      this.googleCalendarService.verificarState(state);
      await this.googleCalendarService.connect(code);
      return res.status(200).send(this.callbackHtml(true));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      return res.status(400).send(this.callbackHtml(false, message));
    }
  }

  private callbackHtml(success: boolean, message?: string): string {
    const status = success ? 'success' : 'error';
    const payload = JSON.stringify({ type: 'GOOGLE_CALENDAR_CALLBACK', status, message: message || null });
    return `
<!DOCTYPE html>
<html>
  <head><title>Google Calendar</title></head>
  <body>
    <script>
      if (window.opener) {
        window.opener.postMessage(${payload}, '*');
      }
      window.close();
    </script>
    <p>${success ? 'Conectado correctamente.' : 'Error: ' + (message || 'desconocido')}</p>
    <p>Podés cerrar esta ventana.</p>
  </body>
</html>
    `.trim();
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
