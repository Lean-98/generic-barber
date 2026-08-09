import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '@prisma/client';

/**
 * Sin este filtro, cualquier violación de constraint de Postgres (borrar un
 * registro que todavía tiene relaciones, crear un valor duplicado en una
 * columna única, etc.) sube como una excepción sin manejar y termina en un
 * 500 opaco. Acá la traducimos a una respuesta 4xx clara.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    switch (exception.code) {
      case 'P2002': {
        const campos = (exception.meta?.target as string[] | undefined)?.join(', ') || 'campo';
        return response.status(HttpStatus.CONFLICT).json({
          statusCode: HttpStatus.CONFLICT,
          message: `Ya existe un registro con ese valor (${campos})`,
          error: 'Conflict',
        });
      }
      case 'P2003':
        return response.status(HttpStatus.CONFLICT).json({
          statusCode: HttpStatus.CONFLICT,
          message: 'No se puede completar la operación: hay otros registros que dependen de este',
          error: 'Conflict',
        });
      case 'P2025':
        return response.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'El registro solicitado no existe',
          error: 'Not Found',
        });
      default:
        return response.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'No se pudo completar la operación sobre la base de datos',
          error: 'Bad Request',
        });
    }
  }
}
