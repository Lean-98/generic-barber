import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { cleanDatabase } from './setup-e2e';
import { getAuthToken } from './helpers/auth.helper';

describe('CajaController (e2e)', () => {
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

    // Crear persona
    const persona = await prisma.persona.create({
      data: { nombre: 'Cliente', apellido: 'Test' },
    });
    personaId = persona.idPersona;

    // Crear servicio
    const servicio = await prisma.servicio.create({
      data: { nombre: 'Corte', precio: 25.0, duracionMinutos: 30 },
    });
    servicioId = servicio.idServicio;

    // Crear forma de pago
    const formaPago = await prisma.formaPago.create({
      data: { nombre: 'Efectivo', requiereComprobante: false },
    });
    formaPagoId = formaPago.idFormaPago;

    // Crear turno y finalizarlo
    const turno = await prisma.turno.create({
      data: {
        idPersona: personaId,
        fechaHoraInicio: new Date('2026-06-15T10:00:00Z'),
        fechaHoraFin: new Date('2026-06-15T10:30:00Z'),
        estado: 'FINALIZADO',
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
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /api/caja/pagos', () => {
    it('should process payment and mark turno as PAGADO', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/caja/pagos')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          idTurno: turnoId,
          idFormaPago: formaPagoId,
          monto: 25.0,
        });

      expect(response.status).toBe(201);
      expect(response.body.pago).toBeDefined();
      expect(response.body.movimiento).toBeDefined();
      expect(response.body.turnoActualizado).toBe(true);
    });

    it('should return 400 for invalid turno estado', async () => {
      // Cambiar turno a PENDIENTE
      await prisma.turno.update({
        where: { idTurno: turnoId },
        data: { estado: 'PENDIENTE' },
      });

      const response = await request(app.getHttpServer())
        .post('/api/caja/pagos')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          idTurno: turnoId,
          idFormaPago: formaPagoId,
          monto: 25.0,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/caja/movimientos', () => {
    it('should register an egreso', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/caja/movimientos')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tipo: 'EGRESO',
          monto: 50.0,
          concepto: 'Compra de insumos',
          idFormaPago: formaPagoId,
        });

      expect(response.status).toBe(201);
      expect(response.body.tipo).toBe('EGRESO');
    });
  });

  describe('GET /api/caja/movimientos/totales', () => {
    it('should return daily totals', async () => {
      // Crear un movimiento de ingreso
      await prisma.movimientoCaja.create({
        data: {
          fechaHora: new Date(),
          tipo: 'INGRESO',
          monto: 100.0,
          concepto: 'Venta',
          idFormaPago: formaPagoId,
          idUsuario: authUsuario,
        },
      });

      const response = await request(app.getHttpServer())
        .get('/api/caja/movimientos/totales')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.ingresos).toBe(100);
      expect(response.body.balance).toBe(100);
    });
  });

  describe('Cierre de Caja', () => {
    it('should iniciar and confirm cierre', async () => {
      // Usar una fecha fija para evitar problemas de zona horaria
      const fecha = '2026-06-15';
      const fechaDate = new Date('2026-06-15T12:00:00Z');

      // Crear movimiento para que haya algo que cerrar
      await prisma.movimientoCaja.create({
        data: {
          fechaHora: fechaDate,
          tipo: 'INGRESO',
          monto: 150.0,
          concepto: 'Venta',
          idFormaPago: formaPagoId,
          idUsuario: authUsuario,
        },
      });

      // Iniciar cierre
      const iniciar = await request(app.getHttpServer())
        .post(`/api/caja/cierre/iniciar?fecha=${fecha}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(iniciar.status).toBe(201);
      expect(Number(iniciar.body.totalEsperado)).toBe(150);
      const cierreId = iniciar.body.idCierre;

      // Confirmar cierre
      const confirmar = await request(app.getHttpServer())
        .post('/api/caja/cierre/confirmar')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          idCierre: cierreId,
          totalReal: 150,
          idUsuario: authUsuario,
        });

      expect(confirmar.status).toBe(200);
      expect(Number(confirmar.body.diferencia)).toBe(0);
    });
  });
});
