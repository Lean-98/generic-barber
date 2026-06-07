import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CierreService } from './cierre.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaServiceMock } from '../../../test/mocks/prisma.service.mock';

describe('CierreService', () => {
  let service: CierreService;
  let prismaMock: PrismaServiceMock;

  const mockCierre = {
    idCierre: 1,
    fecha: new Date('2026-06-15'),
    horaInicio: new Date(),
    horaFin: null,
    totalEfectivo: 100,
    totalTarjeta: 200,
    totalTransferencia: 50,
    totalOtros: 0,
    totalEsperado: 350,
    totalReal: 0,
    diferencia: 0,
    idUsuarioCierra: 'admin',
  };

  const mockFormaPagoEfectivo = { idFormaPago: 1, nombre: 'Efectivo', requiereComprobante: false, vigente: true };
  const mockFormaPagoTarjetaCredito = { idFormaPago: 2, nombre: 'Tarjeta de Crédito', requiereComprobante: true, vigente: true };
  const mockFormaPagoTarjetaDebito = { idFormaPago: 3, nombre: 'Tarjeta de Débito', requiereComprobante: true, vigente: true };
  const mockFormaPagoTransferencia = { idFormaPago: 4, nombre: 'Transferencia', requiereComprobante: false, vigente: true };

  beforeEach(async () => {
    prismaMock = new PrismaServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CierreService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<CierreService>(CierreService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('iniciarCierre', () => {
    it('should create a new cierre with calculated totals', async () => {
      prismaMock.cierreCaja.findFirst.mockResolvedValue(null);
      prismaMock.cierreCaja.create.mockResolvedValue(mockCierre);

      // Mockear formas de pago para las estrategias
      prismaMock.formaPago.findFirst
        .mockResolvedValueOnce(mockFormaPagoEfectivo)
        .mockResolvedValueOnce(mockFormaPagoTransferencia);
      prismaMock.formaPago.findMany
        .mockResolvedValueOnce([mockFormaPagoTarjetaCredito, mockFormaPagoTarjetaDebito])
        .mockResolvedValueOnce([]);

      // Mockear movimientos para las estrategias
      prismaMock.movimientoCaja.findMany
        .mockResolvedValueOnce([{ monto: 100 }]) // Efectivo
        .mockResolvedValueOnce([{ monto: 200 }]) // Tarjeta
        .mockResolvedValueOnce([{ monto: 50 }])  // Transferencia
        .mockResolvedValueOnce([]);              // Otros

      const result = await service.iniciarCierre(new Date('2026-06-15'), 'admin');

      expect(result).toBeDefined();
      expect(prismaMock.cierreCaja.create).toHaveBeenCalled();
    });

    it('should throw if cierre already exists', async () => {
      prismaMock.cierreCaja.findFirst.mockResolvedValue(mockCierre);

      await expect(service.iniciarCierre(new Date('2026-06-15'), 'admin')).rejects.toThrow(BadRequestException);
    });
  });

  describe('confirmarCierre', () => {
    it('should confirm cierre with real amount', async () => {
      prismaMock.cierreCaja.findUnique.mockResolvedValue(mockCierre);
      prismaMock.cierreCaja.update.mockResolvedValue({
        ...mockCierre,
        totalReal: 350,
        diferencia: 0,
        horaFin: new Date(),
      });

      const result = await service.confirmarCierre(1, 350, 'admin');

      expect(result.totalReal).toBe(350);
      expect(result.diferencia).toBe(0);
    });

    it('should throw if cierre already confirmed', async () => {
      prismaMock.cierreCaja.findUnique.mockResolvedValue({
        ...mockCierre,
        horaFin: new Date(),
      });

      await expect(service.confirmarCierre(1, 350, 'admin')).rejects.toThrow(BadRequestException);
    });
  });
});
