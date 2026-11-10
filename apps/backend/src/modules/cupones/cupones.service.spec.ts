import { BadRequestException, ConflictException } from '@nestjs/common';
import { CuponesService, normalizarCodigo } from './cupones.service';
import { PrismaServiceMock } from '../../../test/mocks/prisma.service.mock';

describe('CuponesService', () => {
  let prisma: PrismaServiceMock;
  let service: CuponesService;

  const cupon = (extra: Record<string, unknown> = {}) => ({
    idCupon: 1,
    codigo: 'HOY20',
    descripcion: null,
    descuentoPorcentaje: '20',
    vigenteDesde: new Date('2026-11-10T03:00:00.000Z'),
    vigenteHasta: new Date('2026-11-11T02:59:59.999Z'),
    usosMaximos: null,
    activo: true,
    createdAt: new Date(),
    ...extra,
  });

  beforeEach(() => {
    prisma = new PrismaServiceMock();
    service = new CuponesService(prisma as any);
    jest.useFakeTimers({ now: new Date('2026-11-10T15:00:00.000Z') }); // 12:00 hora AR
  });
  afterEach(() => jest.useRealTimers());

  it('should normalize codes to upper case without spaces around', () => {
    expect(normalizarCodigo('  hoy20 ')).toBe('HOY20');
  });

  describe('create', () => {
    it('should turn the días (hora Argentina, inclusive) into a vigencia', async () => {
      prisma.cupon.findUnique.mockResolvedValue(null);
      prisma.cupon.create.mockImplementation(({ data }) => Promise.resolve(cupon(data)));

      const creado = await service.create({ codigo: 'HOY20', descuentoPorcentaje: 20, desde: '2026-11-10', hasta: '2026-11-10' });

      expect(prisma.cupon.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          vigenteDesde: new Date('2026-11-10T03:00:00.000Z'),
          vigenteHasta: new Date('2026-11-11T02:59:59.999Z'),
          usosMaximos: null,
        }),
      });
      expect(creado).toMatchObject({ desde: '2026-11-10', hasta: '2026-11-10', estado: 'ACTIVO', usos: 0 });
    });

    it('should reject a repeated code', async () => {
      prisma.cupon.findUnique.mockResolvedValue(cupon());
      await expect(service.create({ codigo: 'HOY20', descuentoPorcentaje: 20, desde: '2026-11-10', hasta: '2026-11-10' })).rejects.toThrow(ConflictException);
    });

    it('should reject an end before the start', async () => {
      prisma.cupon.findUnique.mockResolvedValue(null);
      await expect(service.create({ codigo: 'HOY20', descuentoPorcentaje: 20, desde: '2026-11-10', hasta: '2026-11-09' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should count uses and work out the estado', async () => {
      prisma.cupon.findMany.mockResolvedValue([
        cupon({ idCupon: 1, usosMaximos: 2 }),
        cupon({ idCupon: 2, codigo: 'VIEJO', vigenteHasta: new Date('2026-11-01T02:59:59.999Z'), vigenteDesde: new Date('2026-10-01T03:00:00.000Z') }),
        cupon({ idCupon: 3, codigo: 'PAUSA', activo: false }),
        cupon({ idCupon: 4, codigo: 'FINDE', vigenteDesde: new Date('2026-11-14T03:00:00.000Z'), vigenteHasta: new Date('2026-11-16T02:59:59.999Z') }),
      ]);
      prisma.turno.groupBy.mockResolvedValue([{ idCupon: 1, _count: { _all: 2 } }]);

      const lista = await service.findAll();

      expect(lista.map((c) => [c.codigo, c.estado, c.usos])).toEqual([
        ['HOY20', 'AGOTADO', 2],
        ['VIEJO', 'VENCIDO', 0],
        ['PAUSA', 'PAUSADO', 0],
        ['FINDE', 'PROGRAMADO', 0],
      ]);
    });
  });

  describe('remove', () => {
    it('should not delete a cupón that was already used', async () => {
      prisma.cupon.findUnique.mockResolvedValue(cupon());
      prisma.turno.count.mockResolvedValue(3);
      await expect(service.remove(1)).rejects.toThrow('pausalo');
      expect(prisma.cupon.delete).not.toHaveBeenCalled();
    });
  });

  describe('validarParaReserva', () => {
    it('should return the descuento when it can be used', async () => {
      prisma.cupon.findUnique.mockResolvedValue(cupon());
      prisma.turno.count.mockResolvedValue(0);
      await expect(service.validarParaReserva('hoy20', 'juan@example.com')).resolves.toEqual({
        valido: true,
        codigo: 'HOY20',
        descuentoPorcentaje: 20,
        hasta: '2026-11-10',
      });
    });

    it('should explain why it cannot be used instead of throwing', async () => {
      prisma.cupon.findUnique.mockResolvedValue(null);
      await expect(service.validarParaReserva('NOEXISTE')).resolves.toEqual({ valido: false, mensaje: expect.stringContaining('no existe') });
    });

    it('should only let the owner use a personal cupón', async () => {
      prisma.cupon.findUnique.mockResolvedValue(cupon({ idPersona: 5, origen: 'CUMPLEANOS', usosMaximos: 1 }));
      prisma.turno.count.mockResolvedValue(0);
      prisma.persona.findUnique.mockResolvedValue({ mail: 'juan@test.com' });

      await expect(service.validarParaReserva('HOY20', 'otro@test.com')).resolves.toEqual({ valido: false, mensaje: expect.stringContaining('es personal') });
      await expect(service.validarParaReserva('HOY20', 'Juan@Test.com')).resolves.toMatchObject({ valido: true });
    });

    it('should not count cancelled turnos as uses', async () => {
      prisma.cupon.findUnique.mockResolvedValue(cupon({ usosMaximos: 1 }));
      prisma.turno.count.mockResolvedValue(0);
      await service.validarParaReserva('HOY20');
      expect(prisma.turno.count).toHaveBeenCalledWith({ where: { idCupon: 1, estado: { notIn: ['CANCELADO'] } } });
    });
  });
});
