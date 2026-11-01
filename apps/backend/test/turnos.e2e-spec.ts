import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { cleanDatabase } from './setup-e2e';
import { getAuthToken } from './helpers/auth.helper';

describe('TurnosController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let personaId: number;
  let servicioId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
    const auth = await getAuthToken(app, prisma);
    authToken = auth.token;

    // Crear persona
    const persona = await prisma.persona.create({
      data: { nombre: 'Cliente', apellido: 'Test' },
    });
    personaId = persona.idPersona;

    // Crear servicio
    const servicio = await prisma.servicio.create({
      data: {
        nombre: 'Corte',
        precio: 25.0,
        duracionMinutos: 30,
      },
    });
    servicioId = servicio.idServicio;
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /api/turnos', () => {
    it('should create a new turno and return 201', async () => {
      const payload = {
        idPersona: personaId,
        // 2026-06-16 (martes) 12:00 UTC = 9:00 AR, dentro del horario de atención.
        fechaHoraInicio: '2026-06-16T12:00:00.000Z',
        servicios: [{ idServicio: servicioId, cantidad: 1 }],
      };

      const response = await request(app.getHttpServer())
        .post('/api/turnos')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('idTurno');
      // El turno nace CONFIRMADO (ver create() en turnos.service.ts).
      expect(response.body.estado).toBe('CONFIRMADO');
    });

    it('should return 401 without token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/turnos')
        .send({
          idPersona: personaId,
          fechaHoraInicio: '2026-06-16T12:00:00.000Z',
          servicios: [{ idServicio: servicioId }],
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/turnos', () => {
    it('should return an array of turnos', async () => {
      await prisma.turno.create({
        data: {
          idPersona: personaId,
          fechaHoraInicio: new Date('2026-06-16T12:00:00Z'),
          fechaHoraFin: new Date('2026-06-16T12:30:00Z'),
          estado: 'PENDIENTE',
        },
      });

      const response = await request(app.getHttpServer())
        .get('/api/turnos')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('Patrón State - transiciones', () => {
    it('should iniciar -> finalizar -> pagar (el turno ya nace CONFIRMADO)', async () => {
      // 1. Crear turno (nace CONFIRMADO: ver create() en turnos.service.ts,
      // ya no hace falta un paso "confirmar" explícito).
      const createResponse = await request(app.getHttpServer())
        .post('/api/turnos')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          idPersona: personaId,
          fechaHoraInicio: '2026-06-16T12:00:00.000Z',
          servicios: [{ idServicio: servicioId }],
        });

      const turnoId = createResponse.body.idTurno;
      expect(createResponse.body.estado).toBe('CONFIRMADO');

      // 2. Iniciar
      const iniciar = await request(app.getHttpServer())
        .post(`/api/turnos/${turnoId}/iniciar`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(iniciar.body.estado).toBe('EN_PROCESO');

      // 3. Finalizar
      const finalizar = await request(app.getHttpServer())
        .post(`/api/turnos/${turnoId}/finalizar`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(finalizar.body.estado).toBe('COMPLETADO');

      // 4. Pagar
      const pagar = await request(app.getHttpServer())
        .post(`/api/turnos/${turnoId}/pagar`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(pagar.body.estado).toBe('COMPLETADO');
    });

    it('should cancelar a CONFIRMADO turno', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/turnos')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          idPersona: personaId,
          fechaHoraInicio: '2026-06-16T13:00:00.000Z',
          servicios: [{ idServicio: servicioId }],
        });

      const turnoId = createResponse.body.idTurno;

      const cancelar = await request(app.getHttpServer())
        .delete(`/api/turnos/${turnoId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(cancelar.body.estado).toBe('CANCELADO');
    });

    it('should return 400 for invalid state transition', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/turnos')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          idPersona: personaId,
          fechaHoraInicio: '2026-06-16T14:00:00.000Z',
          servicios: [{ idServicio: servicioId }],
        });

      const turnoId = createResponse.body.idTurno;

      // Intentar pagar un turno recién creado, CONFIRMADO (debe fallar: hay
      // que iniciar e finalizar primero).
      const pagar = await request(app.getHttpServer())
        .post(`/api/turnos/${turnoId}/pagar`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(pagar.status).toBe(400);
    });
  });

  describe('GET /api/turnos/:id/total', () => {
    it('should calculate total', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/turnos')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          idPersona: personaId,
          fechaHoraInicio: '2026-06-16T15:00:00.000Z',
          servicios: [{ idServicio: servicioId, cantidad: 2 }],
        });

      const turnoId = createResponse.body.idTurno;

      const response = await request(app.getHttpServer())
        .get(`/api/turnos/${turnoId}/total`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(50); // 25 * 2 = 50
    });
  });
});
