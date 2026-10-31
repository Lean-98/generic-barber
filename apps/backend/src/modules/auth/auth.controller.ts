import { Controller, Post, Body, Get, UseGuards, UnauthorizedException, HttpCode, HttpStatus, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService, DEVICE_COOKIE_NAME, DEVICE_TOKEN_TTL_MS } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Verify2faDto } from './dto/verify-2fa.dto';

/** Mismas opciones al setear y al limpiar, para que el browser matchee la cookie a borrar. */
const deviceCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/auth',
};

/**
 * `register` crea cuentas de staff con acceso total al sistema (turnos, caja,
 * clientes). No hay registro público de peluqueros: solo alguien ya
 * autenticado puede dar de alta a otro miembro del equipo.
 */

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Iniciar sesión (primer paso: credenciales)' })
  @ApiResponse({ status: 200, description: 'Login exitoso, o 2FA pendiente si el dispositivo no es confiable' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const deviceToken = req.cookies?.[DEVICE_COOKIE_NAME];
    return this.authService.login(dto, deviceToken);
  }

  @Post('verify-2fa')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @ApiOperation({ summary: 'Segundo paso del login: código enviado por correo' })
  @ApiResponse({ status: 200, description: 'Código válido, devuelve el token de sesión' })
  @ApiResponse({ status: 401, description: 'Código inválido o expirado' })
  async verifyTwoFactor(@Body() dto: Verify2faDto, @Res({ passthrough: true }) res: Response) {
    const { deviceToken, ...result } = await this.authService.verifyTwoFactor(dto);

    if (deviceToken) {
      res.cookie(DEVICE_COOKIE_NAME, deviceToken, {
        ...deviceCookieOptions,
        maxAge: DEVICE_TOKEN_TTL_MS,
      });
    }

    return result;
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 3_600_000 } })
  @ApiOperation({ summary: 'Solicitar restablecimiento de contraseña' })
  @ApiResponse({ status: 200, description: 'Respuesta genérica (no revela si el email existe)' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Restablecer contraseña con token de email' })
  @ApiResponse({ status: 200, description: 'Contraseña actualizada' })
  @ApiResponse({ status: 400, description: 'Token inválido o expirado' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('register')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Registrar un nuevo usuario (requiere estar autenticado)' })
  @ApiResponse({ status: 201, description: 'Usuario registrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 409, description: 'Usuario o email ya existe' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil del usuario' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getProfile(@CurrentUser() user: any) {
    if (!user?.usuario) {
      throw new UnauthorizedException();
    }
    return this.authService.getProfile(user.usuario);
  }
}
