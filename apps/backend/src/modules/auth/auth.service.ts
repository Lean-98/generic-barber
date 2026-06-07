import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';

/**
 * Datos públicos de un usuario (sin hash de contraseña).
 */
export interface UserPublic {
  usuario: string;
  email: string;
  rol: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Busca un usuario por nombre de usuario o email.
   */
  private async findUserByLogin(login: string) {
    // Primero buscar por usuario
    let user = await this.prisma.usuarioWeb.findUnique({
      where: { usuario: login },
    });

    // Si no existe, buscar por email
    if (!user) {
      user = await this.prisma.usuarioWeb.findUnique({
        where: { email: login },
      });
    }

    return user;
  }

  async validateUser(login: string, password: string): Promise<UserPublic | null> {
    const user = await this.findUserByLogin(login);

    if (user && await bcrypt.compare(password, user.hashPass)) {
      return {
        usuario: user.usuario,
        email: user.email,
        rol: user.rol,
      };
    }
    return null;
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.login, dto.password);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = {
      sub: user.usuario,
      email: user.email,
      rol: user.rol,
    };

    return {
      access_token: this.jwtService.sign(payload, {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRES_IN', '7d'),
      }),
      user: {
        usuario: user.usuario,
        email: user.email,
        rol: user.rol,
      },
    };
  }

  async register(dto: RegisterDto) {
    // Verificar si el usuario ya existe
    const existingUser = await this.prisma.usuarioWeb.findUnique({
      where: { usuario: dto.usuario },
    });

    if (existingUser) {
      throw new ConflictException('El usuario ya existe');
    }

    // Verificar si el email ya existe
    const existingEmail = await this.prisma.usuarioWeb.findUnique({
      where: { email: dto.email },
    });

    if (existingEmail) {
      throw new ConflictException('El email ya está registrado');
    }

    // Crear persona
    const persona = await this.prisma.persona.create({
      data: {
        nombre: dto.nombre,
        apellido: dto.apellido,
        telefono: dto.telefono,
      },
    });

    // Crear usuario
    const hashPass = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.usuarioWeb.create({
      data: {
        usuario: dto.usuario,
        email: dto.email,
        hashPass,
        rol: 'PELUQUERO',
        idPersona: persona.idPersona,
      },
    });

    return {
      usuario: user.usuario,
      email: user.email,
      rol: user.rol,
    };
  }

  async getProfile(usuario: string): Promise<UserPublic> {
    const user = await this.prisma.usuarioWeb.findUnique({
      where: { usuario },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return {
      usuario: user.usuario,
      email: user.email,
      rol: user.rol,
    };
  }
}
