import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { cleanDatabase } from './setup-e2e';
import * as bcrypt from 'bcrypt';

/**
 * Test E2E (End-to-End): Auth
 *
 * Flujo probado:
 *   HTTP Request → Controller → Service → Prisma → PostgreSQL → JWT → Respuesta
 */
describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user and return 201', async () => {
      // Arrange
      const payload = {
        usuario: 'peluquero1',
        email: 'peluquero@test.com',
        password: 'password123',
        nombre: 'Juan',
        apellido: 'Pérez',
        telefono: '+54 11 1234-5678',
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(payload);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        usuario: payload.usuario,
        email: payload.email,
        rol: 'PELUQUERO',
      });
      expect(response.body).not.toHaveProperty('hashPass');
      expect(response.body).not.toHaveProperty('persona');
    });

    it('should return 409 when username already exists', async () => {
      // Arrange
      const payload = {
        usuario: 'peluquero1',
        email: 'peluquero@test.com',
        password: 'password123',
        nombre: 'Juan',
        apellido: 'Pérez',
      };

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(payload);

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ ...payload, email: 'otro@test.com' });

      // Assert
      expect(response.status).toBe(409);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with username and return JWT token', async () => {
      // Arrange: crear usuario
      const persona = await prisma.persona.create({
        data: { nombre: 'Admin', apellido: 'Test' },
      });

      const hashPass = await bcrypt.hash('admin123', 10);
      await prisma.usuarioWeb.create({
        data: {
          usuario: 'admin',
          email: 'admin@test.com',
          hashPass,
          rol: 'ADMIN',
          idPersona: persona.idPersona,
        },
      });

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          login: 'admin',
          password: 'admin123',
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.usuario).toBe('admin');
      expect(response.body.user.rol).toBe('ADMIN');
      expect(response.body.user).not.toHaveProperty('nombre');
      expect(response.body.user).not.toHaveProperty('apellido');
    });

    it('should login with email and return JWT token', async () => {
      // Arrange: crear usuario
      const persona = await prisma.persona.create({
        data: { nombre: 'Admin', apellido: 'Test' },
      });

      const hashPass = await bcrypt.hash('admin123', 10);
      await prisma.usuarioWeb.create({
        data: {
          usuario: 'admin',
          email: 'admin@test.com',
          hashPass,
          rol: 'ADMIN',
          idPersona: persona.idPersona,
        },
      });

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          login: 'admin@test.com',
          password: 'admin123',
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('access_token');
      expect(response.body.user.usuario).toBe('admin');
    });

    it('should return 401 with invalid credentials', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          login: 'noexiste',
          password: 'wrongpass',
        });

      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should return minimal profile when authenticated', async () => {
      // Arrange: crear usuario y loguear
      const persona = await prisma.persona.create({
        data: { nombre: 'Admin', apellido: 'Test' },
      });

      const hashPass = await bcrypt.hash('admin123', 10);
      await prisma.usuarioWeb.create({
        data: {
          usuario: 'admin',
          email: 'admin@test.com',
          hashPass,
          rol: 'ADMIN',
          idPersona: persona.idPersona,
        },
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ login: 'admin', password: 'admin123' });

      const token = loginResponse.body.access_token;

      // Act
      const response = await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.usuario).toBe('admin');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('rol');
      expect(response.body).not.toHaveProperty('hashPass');
      expect(response.body).not.toHaveProperty('persona');
    });

    it('should return 401 without token', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/api/auth/profile');

      // Assert
      expect(response.status).toBe(401);
    });
  });

});
