import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/modules/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

/**
 * Registra `usuario` como dispositivo de confianza (mismo mecanismo que
 * POST /auth/verify-2fa con recordarDispositivo:true) y devuelve el token
 * crudo para mandarlo como cookie `device_token` en el login. Así se salta
 * el paso de 2FA por correo sin depender de un mail real ni de un mock
 * leíble desde el test (ver AuthService.login / esDispositivoConfiable).
 */
export async function crearDispositivoConfiable(prisma: PrismaService, usuario: string): Promise<string> {
  const deviceToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(deviceToken).digest('hex');
  await prisma.dispositivoConfiable.create({
    data: {
      usuario,
      tokenHash,
      expiraEn: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  return deviceToken;
}

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

  const deviceToken = await crearDispositivoConfiable(prisma, uniqueUser);

  // Login (con el dispositivo de confianza ya registrado, se salta el 2FA
  // y se obtiene el access_token en el mismo paso) y obtener token
  const response = await request(app.getHttpServer())
    .post('/api/auth/login')
    .set('Cookie', `device_token=${deviceToken}`)
    .send({ login: uniqueUser, password });

  if (response.status !== 200 || !response.body.access_token) {
    throw new Error(`Login failed: ${response.status} - ${JSON.stringify(response.body)}`);
  }

  return { token: response.body.access_token, usuario: uniqueUser };
}
