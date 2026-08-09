import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // El token solo prueba que en algún momento se emitió para este usuario;
    // sin este chequeo, un usuario borrado sigue teniendo acceso hasta que
    // el token expira solo (hasta 7 días).
    const user = await this.prisma.usuarioWeb.findUnique({
      where: { usuario: payload.sub },
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
