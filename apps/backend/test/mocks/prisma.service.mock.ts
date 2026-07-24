import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Mock de PrismaService para testing unitario.
 * Simula la interfaz de PrismaClient sin conectarse a la base de datos.
 */
@Injectable()
export class PrismaServiceMock {
  servicio = {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  servicioHistorial = {
    create: jest.fn(),
    findMany: jest.fn(),
  };

  turno = {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    groupBy: jest.fn(),
  };

  turnoDetalle = {
    create: jest.fn(),
    findMany: jest.fn(),
  };

  persona = {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  usuarioWeb = {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  };

  formaPago = {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  };

  pago = {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    aggregate: jest.fn(),
  };

  movimientoCaja = {
    create: jest.fn(),
    findMany: jest.fn(),
    aggregate: jest.fn(),
  };

  cierreCaja = {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  };

  googleCalendarConfig = {
    create: jest.fn(),
    findFirst: jest.fn(),
    deleteMany: jest.fn(),
  };

  // Simula la conexión/desconexión sin hacer nada
  async $connect() {}
  async $disconnect() {}
  async $transaction<T>(fn: (prisma: PrismaServiceMock) => Promise<T>): Promise<T> {
    return fn(this);
  }
}
