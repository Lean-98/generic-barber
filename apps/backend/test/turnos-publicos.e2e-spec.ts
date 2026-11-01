import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { cleanDatabase } from './setup-e2e';

/**
 * Test E2E: Reserva Pública (Turnos)
 * 
 * Flujo probado:
 *   Cliente sin login → GET disponibilidad → POST reservar → Turno creado
 */
describe('TurnosPublicosController (e2e)', () => {
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

  describe('GET /api/turnos-publicos/disponibilidad', () => {
    it('should return available slots for a given date', async () => {
      // Arrange: crear servicio
      const servicio = await prisma.servicio.create({
        data: {
          nombre: 'Corte',
          precio: 25.0,
          duracionMinutos: 30,
          vigente: true,
        },
      });

      // 2026-06-16 es martes: horario partido 9:00-13:30 / 16:30-20:30 AR
      // (ver configuracion_negocio.horarios); el lunes (dia: 1) está cerrado.
      const fecha = '2026-06-16';

      // Act
      const response = await request(app.getHttpServer())
        .get(`/api/turnos-publicos/disponibilidad?fecha=${fecha}&servicios=${servicio.idServicio}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('slots');
      expect(response.body).toHaveProperty('duracionTotal');
      expect(response.body.duracionTotal).toBe(30);
      expect(response.body.slots.length).toBeGreaterThan(0);
      // Primera franja abre 9:00 hora Argentina (UTC-3): en UTC es 12:00,
      // ya que las fechas se serializan siempre en UTC.
      expect(response.body.slots[0]).toContain('2026-06-16T12:00:00');
    });

    it('should return empty slots when all day is occupied', async () => {
      // Arrange: crear servicio y ocupar todo el día
      const servicio = await prisma.servicio.create({
        data: {
          nombre: 'Corte',
          precio: 25.0,
          duracionMinutos: 30,
          vigente: true,
        },
      });

      const persona = await prisma.persona.create({
        data: { nombre: 'Juan', apellido: 'Pérez' },
      });

      // Ocupar ambas franjas del horario partido (9:00-13:30 y 16:30-20:30
      // AR, es decir 12:00-23:30 UTC) cada 30 min, para que no quede ningún
      // slot libre en ninguna de las dos.
      const fecha = '2026-06-16';
      for (let hora = 12; hora < 24; hora++) {
        for (let minuto = 0; minuto < 60; minuto += 30) {
          const inicio = new Date(`${fecha}T${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}:00Z`);
          const fin = new Date(inicio.getTime() + 30 * 60000);
          await prisma.turno.create({
            data: {
              idPersona: persona.idPersona,
              fechaHoraInicio: inicio,
              fechaHoraFin: fin,
              estado: 'PENDIENTE',
            },
          });
        }
      }

      // Act
      const response = await request(app.getHttpServer())
        .get(`/api/turnos-publicos/disponibilidad?fecha=${fecha}&servicios=${servicio.idServicio}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.slots.length).toBe(0);
    });
  });

  describe('POST /api/turnos-publicos/reservar', () => {
    it('should create a new turno from public reservation', async () => {
      // Arrange: crear servicio
      const servicio = await prisma.servicio.create({
        data: {
          nombre: 'Corte',
          precio: 25.0,
          duracionMinutos: 30,
          vigente: true,
        },
      });

      const formaPago = await prisma.formaPago.create({
        data: { nombre: 'Efectivo', vigente: true },
      });

      const payload = {
        nombre: 'María',
        apellido: 'Gómez',
        email: 'maria@example.com',
        telefono: '+54 11 9876-5432',
        // 2026-06-16 (martes) 12:00 UTC = 9:00 AR, apertura de la franja matutina.
        fechaHoraInicio: '2026-06-16T12:00:00.000Z',
        observacion: 'Primera vez',
        servicios: [{ idServicio: servicio.idServicio, cantidad: 1 }],
        idFormaPagoPreferida: formaPago.idFormaPago,
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/turnos-publicos/reservar')
        .send(payload);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('idTurno');
      // El turno nace CONFIRMADO (ver create() en turnos.service.ts): no
      // hay más un paso "confirmar" manual para los turnos nuevos.
      expect(response.body.estado).toBe('CONFIRMADO');

      // Verificar que la persona fue creada
      const persona = await prisma.persona.findUnique({
        where: { mail: 'maria@example.com' },
      });
      expect(persona).toBeTruthy();
      expect(persona!.nombre).toBe('María');
    });

    it('should reuse existing persona if email already exists', async () => {
      // Arrange: crear servicio y persona
      const servicio = await prisma.servicio.create({
        data: {
          nombre: 'Corte',
          precio: 25.0,
          duracionMinutos: 30,
          vigente: true,
        },
      });

      const personaExistente = await prisma.persona.create({
        data: {
          nombre: 'Carlos',
          apellido: 'López',
          mail: 'carlos@example.com',
        },
      });

      const formaPago = await prisma.formaPago.create({
        data: { nombre: 'Efectivo', vigente: true },
      });

      const payload = {
        nombre: 'Carlos',
        apellido: 'López',
        email: 'carlos@example.com',
        // 2026-06-16 (martes) 14:00 UTC = 11:00 AR, dentro de la franja matutina.
        fechaHoraInicio: '2026-06-16T14:00:00.000Z',
        servicios: [{ idServicio: servicio.idServicio, cantidad: 1 }],
        idFormaPagoPreferida: formaPago.idFormaPago,
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/turnos-publicos/reservar')
        .send(payload);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.idPersona).toBe(personaExistente.idPersona);
    });
  });
});
