import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
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
        fechaHoraInicio: '2026-06-15T10:00:00.000Z',
        servicios: [{ idServicio: servicioId, cantidad: 1 }],
      };

      const response = await request(app.getHttpServer())
        .post('/api/turnos')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('idTurno');
      expect(response.body.estado).toBe('PENDIENTE');
    });

    it('should return 401 without token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/turnos')
        .send({
          idPersona: personaId,
          fechaHoraInicio: '2026-06-15T10:00:00.000Z',
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
          fechaHoraInicio: new Date('2026-06-15T10:00:00Z'),
          fechaHoraFin: new Date('2026-06-15T10:30:00Z'),
          estado: 'PENDIENTE',
        },
      });

      const response = await request(app.getHttpServer())
        .get('/api/turnos')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });
  });

  describe('Patrón State - transiciones', () => {
    it('should confirmar -> iniciar -> finalizar -> pagar', async () => {
      // 1. Crear turno
      const createResponse = await request(app.getHttpServer())
        .post('/api/turnos')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          idPersona: personaId,
          fechaHoraInicio: '2026-06-15T10:00:00.000Z',
          servicios: [{ idServicio: servicioId }],
        });

      const turnoId = createResponse.body.idTurno;
      expect(createResponse.body.estado).toBe('PENDIENTE');

      // 2. Confirmar
      const confirmar = await request(app.getHttpServer())
        .post(`/api/turnos/${turnoId}/confirmar`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(confirmar.body.estado).toBe('CONFIRMADO');

      // 3. Iniciar
      const iniciar = await request(app.getHttpServer())
        .post(`/api/turnos/${turnoId}/iniciar`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(iniciar.body.estado).toBe('EN_ATENCION');

      // 4. Finalizar
      const finalizar = await request(app.getHttpServer())
        .post(`/api/turnos/${turnoId}/finalizar`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(finalizar.body.estado).toBe('FINALIZADO');

      // 5. Pagar
      const pagar = await request(app.getHttpServer())
        .post(`/api/turnos/${turnoId}/pagar`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(pagar.body.estado).toBe('PAGADO');
    });

    it('should cancelar a PENDIENTE turno', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/turnos')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          idPersona: personaId,
          fechaHoraInicio: '2026-06-15T11:00:00.000Z',
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
          fechaHoraInicio: '2026-06-15T12:00:00.000Z',
          servicios: [{ idServicio: servicioId }],
        });

      const turnoId = createResponse.body.idTurno;

      // Intentar pagar un PENDIENTE (debe fallar)
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
          fechaHoraInicio: '2026-06-15T13:00:00.000Z',
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
