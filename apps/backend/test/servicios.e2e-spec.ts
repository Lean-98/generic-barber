import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { cleanDatabase } from './setup-e2e';
import { getAuthToken } from './helpers/auth.helper';

describe('ServiciosController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

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
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /api/servicios', () => {
    it('should create a new service and return 201', async () => {
      const payload = {
        nombre: 'Corte de cabello',
        descripcion: 'Corte clásico para caballero',
        precio: 25.0,
        duracionMinutos: 30,
      };

      const response = await request(app.getHttpServer())
        .post('/api/servicios')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        nombre: payload.nombre,
        descripcion: payload.descripcion,
        precio: '25',
        duracionMinutos: 30,
        vigente: true,
      });
    });

    it('should return 401 without token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/servicios')
        .send({ nombre: 'Test', precio: 10, duracionMinutos: 10 });

      expect(response.status).toBe(401);
    });

    it('should return 400 when nombre is missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/servicios')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ precio: 25.0, duracionMinutos: 30 });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/servicios', () => {
    it('should return an array of services', async () => {
      await prisma.servicio.create({
        data: { nombre: 'Coloración', precio: 50.0, duracionMinutos: 60 },
      });

      const response = await request(app.getHttpServer())
        .get('/api/servicios')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
    });
  });
});
