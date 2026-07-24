import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { cleanDatabase } from './setup-e2e';
import { getAuthToken } from './helpers/auth.helper';

describe('ReportesController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let authUsuario: string;
  let personaId: number;
  let servicioId: number;
  let formaPagoId: number;
  let turnoId: number;

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
    authUsuario = auth.usuario;

    const persona = await prisma.persona.create({
      data: { nombre: 'Cliente', apellido: 'Test' },
    });
    personaId = persona.idPersona;

    const servicio = await prisma.servicio.create({
      data: { nombre: 'Corte', precio: 25.0, duracionMinutos: 30 },
    });
    servicioId = servicio.idServicio;

    const formaPago = await prisma.formaPago.create({
      data: { nombre: 'Efectivo', requiereComprobante: false },
    });
    formaPagoId = formaPago.idFormaPago;

    const turno = await prisma.turno.create({
      data: {
        idPersona: personaId,
        fechaHoraInicio: new Date('2026-06-15T10:00:00Z'),
        fechaHoraFin: new Date('2026-06-15T10:30:00Z'),
        estado: 'COMPLETADO',
      },
    });
    turnoId = turno.idTurno;

    await prisma.turnoDetalle.create({
      data: {
        idTurno: turnoId,
        idServicio: servicioId,
        precioReal: 25.0,
        cantidad: 1,
      },
    });

    await prisma.pago.create({
      data: {
        idTurno: turnoId,
        idFormaPago: formaPagoId,
        monto: 25.0,
        fechaHora: new Date('2026-06-15T10:30:00Z'),
      },
    });

    await prisma.movimientoCaja.create({
      data: {
        idUsuario: authUsuario,
        idTurno: turnoId,
        idFormaPago: formaPagoId,
        tipo: 'INGRESO',
        monto: 25.0,
        concepto: 'Pago de turno',
        fechaHora: new Date('2026-06-15T10:30:00Z'),
      },
    });

    await prisma.movimientoCaja.create({
      data: {
        idUsuario: authUsuario,
        idFormaPago: formaPagoId,
        tipo: 'EGRESO',
        monto: 5.0,
        concepto: 'Gastos varios',
        fechaHora: new Date('2026-06-15T11:00:00Z'),
      },
    });
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await prisma.$disconnect();
    await app.close();
  });

  describe('GET /api/reportes', () => {
    it('resumen del período', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/reportes/resumen?desde=2026-06-01&hasta=2026-06-30')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.totalIngresos).toBe(25);
      expect(response.body.totalEgresos).toBe(5);
      expect(response.body.balance).toBe(20);
      expect(response.body.totalTurnos).toBe(1);
      expect(response.body.turnosPagados).toBe(1);
      expect(response.body.turnosCancelados).toBe(0);
    });

    it('ingresos por día', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/reportes/ingresos?desde=2026-06-01&hasta=2026-06-30')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].ingresos).toBe(25);
      expect(response.body[0].egresos).toBe(5);
      expect(response.body[0].balance).toBe(20);
    });

    it('turnos por estado', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/reportes/turnos?desde=2026-06-01&hasta=2026-06-30')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(expect.arrayContaining([{ estado: 'COMPLETADO', cantidad: 1 }]));

    });

    it('servicios más solicitados', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/reportes/servicios?desde=2026-06-01&hasta=2026-06-30')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].nombre).toBe('Corte');
      expect(response.body[0].cantidad).toBe(1);
      expect(response.body[0].ingresos).toBe(25);
    });

    it('top clientes', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/reportes/clientes?desde=2026-06-01&hasta=2026-06-30')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].nombre).toBe('Cliente');
      expect(response.body[0].cantidadTurnos).toBe(1);
      expect(response.body[0].ingresos).toBe(25);
    });

    it('ingresos por forma de pago', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/reportes/formas-pago?desde=2026-06-01&hasta=2026-06-30')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].nombre).toBe('Efectivo');
      expect(response.body[0].monto).toBe(25);
    });
  });
});
