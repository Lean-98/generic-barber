import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CajaFacade } from './caja.facade';
import { PagosService } from './pagos.service';
import { MovimientosService } from './movimientos.service';
import { TurnosService } from '../turnos/turnos.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaServiceMock } from '../../../test/mocks/prisma.service.mock';
import { CreatePagoDto } from './dto/create-pago.dto';

describe('CajaFacade', () => {
  let facade: CajaFacade;
  let prismaMock: PrismaServiceMock;

  const mockTurno = {
    idTurno: 1,
    estado: 'FINALIZADO',
    detalles: [{ precioReal: 25, cantidad: 1 }],
  };

  const mockFormaPago = {
    idFormaPago: 1,
    nombre: 'Efectivo',
  };

  beforeEach(async () => {
    prismaMock = new PrismaServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CajaFacade,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: PagosService,
          useValue: {
            create: jest.fn().mockResolvedValue({ idPago: 1, monto: 25 }),
            calcularTotalPagado: jest.fn().mockResolvedValue(25),
          },
        },
        {
          provide: MovimientosService,
          useValue: {
            create: jest.fn().mockResolvedValue({ idMovimiento: 1, tipo: 'INGRESO' }),
          },
        },
        {
          provide: TurnosService,
          useValue: {
            findOne: jest.fn().mockResolvedValue(mockTurno),
            calcularTotal: jest.fn().mockResolvedValue(25),
            registrarPago: jest.fn().mockResolvedValue({ ...mockTurno, estado: 'PAGADO' }),
          },
        },
      ],
    }).compile();

    facade = module.get<CajaFacade>(CajaFacade);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(facade).toBeDefined();
  });

  describe('procesarPago', () => {
    it('should process payment and create movimiento', async () => {
      prismaMock.formaPago.findUnique.mockResolvedValue(mockFormaPago);

      const dto: CreatePagoDto = {
        idTurno: 1,
        idFormaPago: 1,
        monto: 25,
      };

      const result = await facade.procesarPago(dto, 'admin');

      expect(result.pago).toBeDefined();
      expect(result.movimiento).toBeDefined();
      expect(result.turnoActualizado).toBe(true);
    });
  });
});
