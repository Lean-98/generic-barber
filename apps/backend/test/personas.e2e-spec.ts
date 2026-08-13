import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { cleanDatabase } from './setup-e2e';
import { getAuthToken } from './helpers/auth.helper';

describe('PersonasController (e2e)', () => {
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

  describe('POST /api/personas', () => {
    it('should create a new persona and return 201', async () => {
      const payload = {
        nombre: 'Juan',
        apellido: 'Pérez',
        mail: 'juan@example.com',
      };

      const response = await request(app.getHttpServer())
        .post('/api/personas')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body.nombre).toBe('Juan');
    });
  });

  describe('GET /api/personas', () => {
    it('should return an array of personas', async () => {
      await prisma.persona.create({
        data: { nombre: 'María', apellido: 'González' },
      });

      const response = await request(app.getHttpServer())
        .get('/api/personas')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      // +1 porque getAuthToken crea una persona para el admin
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/personas/search', () => {
    it('should search by query text', async () => {
      await prisma.persona.create({
        data: { nombre: 'Carlos', apellido: 'Lopez', mail: 'carlos@test.com' },
      });

      const response = await request(app.getHttpServer())
        .get('/api/personas/search')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ q: 'Lopez' });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('GET /api/personas/:id', () => {
    it('should return 404 when persona does not exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/personas/99999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });
});
