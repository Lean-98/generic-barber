import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Deja pasar siempre, pero si la request trae un token válido carga
 * `req.user`. Sirve para endpoints públicos que muestran datos extra al
 * panel (ej. el costo de insumos de un servicio no se muestra en la landing).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser = any>(_err: unknown, user: TUser): TUser {
    return (user || null) as TUser;
  }
}
