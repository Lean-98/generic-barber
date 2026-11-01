import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
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
    estado: 'COMPLETADO',
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
            registrarPago: jest.fn().mockResolvedValue({ ...mockTurno, estado: 'COMPLETADO' }),
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

  describe('venderProducto', () => {
    const pomada = { idProducto: 7, nombre: 'Pomada', precio: 4500, vigente: true, stock: 5 };
    let movimientos: { create: jest.Mock };

    beforeEach(() => {
      movimientos = (facade as any).movimientosService;
      prismaMock.formaPago.findUnique.mockResolvedValue({ idFormaPago: 1, nombre: 'Efectivo', vigente: true });
    });

    it('should register the income and discount the stock', async () => {
      prismaMock.producto.findUnique.mockResolvedValue(pomada);
      prismaMock.producto.updateMany.mockResolvedValue({ count: 1 });

      const res = await facade.venderProducto({ idProducto: 7, cantidad: 2, idFormaPago: 1 }, 'admin');

      expect(prismaMock.producto.updateMany).toHaveBeenCalledWith({
        where: { idProducto: 7, stock: { gte: 2 } },
        data: { stock: { decrement: 2 } },
      });
      expect(movimientos.create).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: 'INGRESO', monto: 9000, idProducto: 7, cantidadProducto: 2, idUsuario: 'admin' }),
        expect.anything(),
      );
      expect(res.stockRestante).toBe(3);
    });

    it('should reject the sale when there is not enough stock, without registering income', async () => {
      prismaMock.producto.findUnique.mockResolvedValueOnce(pomada).mockResolvedValueOnce({ ...pomada, stock: 1 });
      prismaMock.producto.updateMany.mockResolvedValue({ count: 0 });

      await expect(facade.venderProducto({ idProducto: 7, cantidad: 2, idFormaPago: 1 }, 'admin')).rejects.toThrow(
        /quedan 1/,
      );
      expect(movimientos.create).not.toHaveBeenCalled();
    });

    it('should sell products that do not track stock without touching it', async () => {
      prismaMock.producto.findUnique.mockResolvedValue({ ...pomada, stock: null });

      const res = await facade.venderProducto({ idProducto: 7, cantidad: 3, idFormaPago: 1 }, 'admin');

      expect(prismaMock.producto.updateMany).not.toHaveBeenCalled();
      expect(res.stockRestante).toBeNull();
      expect(movimientos.create).toHaveBeenCalledWith(expect.objectContaining({ monto: 13500 }), expect.anything());
    });

    it('should reject products that are not vigente or do not exist', async () => {
      prismaMock.producto.findUnique.mockResolvedValueOnce({ ...pomada, vigente: false });
      await expect(facade.venderProducto({ idProducto: 7, cantidad: 1, idFormaPago: 1 }, 'admin')).rejects.toThrow(
        BadRequestException,
      );

      prismaMock.producto.findUnique.mockResolvedValueOnce(null);
      await expect(facade.venderProducto({ idProducto: 99, cantidad: 1, idFormaPago: 1 }, 'admin')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject an invalid payment method', async () => {
      prismaMock.producto.findUnique.mockResolvedValue(pomada);
      prismaMock.formaPago.findUnique.mockResolvedValue({ idFormaPago: 9, nombre: 'Vieja', vigente: false });

      await expect(facade.venderProducto({ idProducto: 7, cantidad: 1, idFormaPago: 9 }, 'admin')).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaMock.producto.updateMany).not.toHaveBeenCalled();
    });
  });
});
