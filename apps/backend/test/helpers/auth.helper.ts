import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/modules/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

/**
 * Helper para tests E2E: crea un usuario y devuelve el token JWT
 * Cada llamada crea un usuario completamente nuevo
 */
export async function getAuthToken(
  app: INestApplication,
  prisma: PrismaService,
  password = 'admin123',
): Promise<{ token: string; usuario: string }> {
  const timestamp = Date.now();
  const uniqueUser = `admin_${timestamp}`;
  const uniqueEmail = `admin_${timestamp}@test.com`;

  // Crear persona y usuario en una transacción para garantizar consistencia
  const result = await prisma.$transaction(async (tx) => {
    const persona = await tx.persona.create({
      data: {
        nombre: 'Admin',
        apellido: 'Test',
        mail: uniqueEmail,
      },
    });

    const hashPass = await bcrypt.hash(password, 10);
    const user = await tx.usuarioWeb.create({
      data: {
        usuario: uniqueUser,
        email: uniqueEmail,
        hashPass,
        rol: 'ADMIN',
        idPersona: persona.idPersona,
      },
    });

    return { persona, user };
  });

  // Login y obtener token
  const response = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ login: uniqueUser, password });

  if (response.status !== 200) {
    throw new Error(`Login failed: ${response.status} - ${JSON.stringify(response.body)}`);
  }

  return { token: response.body.access_token, usuario: uniqueUser };
}
