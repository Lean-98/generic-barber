import { NotFoundException } from '@nestjs/common';
import { CumpleanosService } from './cumpleanos.service';
import { generarTokenBaja } from './baja-promociones-token.util';
import { PrismaServiceMock } from '../../../test/mocks/prisma.service.mock';

describe('CumpleanosService', () => {
  let prisma: PrismaServiceMock;
  let mail: { sendCuponCumpleanos: jest.Mock };
  let service: CumpleanosService;
  const config = { get: (k: string) => ({ FRONTEND_URL: 'https://barber.test', JWT_SECRET: 'secreto' } as Record<string, string>)[k] };

  const persona = {
    idPersona: 5,
    nombre: 'Juan',
    apellido: 'Pérez',
    mail: 'juan@test.com',
    telefono: '3511234567',
    fechaNacimiento: new Date('1990-11-13T00:00:00.000Z'),
    recibePromociones: true,
    aplicaDescuentoPersonal: false,
  };
  const configNegocio = {
    cumpleActivo: true,
    cumpleDescuentoPorcentaje: '20',
    cumpleDiasAnticipacion: 3,
    cumpleDiasValidez: 7,
    cumpleDiasRecordatorio: 2,
    nombre: 'Authentic',
    logoUrl: null,
    colorPrimario: null,
  };

  beforeEach(() => {
    prisma = new PrismaServiceMock();
    mail = { sendCuponCumpleanos: jest.fn().mockResolvedValue(true) };
    service = new CumpleanosService(prisma as any, mail as any, config as any);
    // 10/11/2026 12:00 hora AR: el cumple del 13/11 entra hoy (3 días antes).
    jest.useFakeTimers({ now: new Date('2026-11-10T15:00:00.000Z') });
    prisma.configuracionNegocio.findUnique.mockResolvedValue(configNegocio);
    prisma.persona.findMany.mockResolvedValue([persona]);
    prisma.cupon.findUnique.mockResolvedValue(null);
    prisma.cupon.create.mockImplementation(({ data }) => Promise.resolve({ idCupon: 1, ...data }));
  });
  afterEach(() => jest.useRealTimers());

  it('should do nothing when the beneficio is off', async () => {
    prisma.configuracionNegocio.findUnique.mockResolvedValue({ ...configNegocio, cumpleActivo: false });
    await service.enviarCuponesDelDia();
    expect(prisma.persona.findMany).not.toHaveBeenCalled();
  });

  it('should only look at clientes with email, cumpleaños, promos accepted and not empleados', async () => {
    await service.enviarCuponesDelDia();
    expect(prisma.persona.findMany).toHaveBeenCalledWith({
      where: { fechaNacimiento: { not: null }, mail: { not: null }, recibePromociones: true, aplicaDescuentoPersonal: false },
    });
  });

  it('should create a personal cupón for the semana del cumple and mail it', async () => {
    await service.enviarCuponesDelDia();

    expect(prisma.cupon.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        codigo: expect.stringMatching(/^CUMPLE-JUAN-[A-Z0-9]{4}$/),
        descuentoPorcentaje: 20,
        vigenteDesde: new Date('2026-11-10T03:00:00.000Z'), // 10/11 00:00 AR
        vigenteHasta: new Date('2026-11-17T02:59:59.999Z'), // 16/11 23:59 AR
        usosMaximos: 1,
        origen: 'CUMPLEANOS',
        idPersona: 5,
        anioCumpleanos: 2026,
      }),
    });
    expect(mail.sendCuponCumpleanos).toHaveBeenCalledWith(
      'juan@test.com',
      expect.objectContaining({
        fechaCumple: '13/11',
        hasta: '16/11',
        reservarUrl: expect.stringMatching(/^https:\/\/barber\.test\/reservar\?cupon=CUMPLE-JUAN-/),
        bajaUrl: expect.stringMatching(/^https:\/\/barber\.test\/promociones\?token=5\./),
      }),
    );
  });

  it('should send it only once per year', async () => {
    prisma.cupon.findUnique.mockResolvedValue({ idCupon: 9 });
    await service.enviarCuponesDelDia();
    expect(prisma.cupon.create).not.toHaveBeenCalled();
    expect(mail.sendCuponCumpleanos).not.toHaveBeenCalled();
  });

  it('should list the cumpleaños of the next days with their cupón', async () => {
    prisma.persona.findMany.mockResolvedValue([
      { ...persona, cupones: [{ anioCumpleanos: 2026, codigo: 'CUMPLE-JUAN-AB12', descuentoPorcentaje: '20', vigenteHasta: new Date('2026-11-17T02:59:59.999Z'), turnos: [] }] },
      { ...persona, idPersona: 6, nombre: 'Lejos', fechaNacimiento: new Date('1990-12-25T00:00:00.000Z'), cupones: [] },
    ]);

    const lista = await service.proximos(7);

    expect(lista).toEqual([
      expect.objectContaining({
        idPersona: 5,
        fecha: '2026-11-13',
        edad: 36,
        esHoy: false,
        cupon: { codigo: 'CUMPLE-JUAN-AB12', descuentoPorcentaje: 20, hasta: '16/11', usado: false },
      }),
    ]);
  });

  describe('recordatorio de que vence', () => {
    const cuponPorVencer = {
      idCupon: 3,
      codigo: 'CUMPLE-JUAN-AB12',
      descuentoPorcentaje: '20',
      vigenteHasta: new Date('2026-11-12T02:59:59.999Z'), // 11/11 23:59 AR
      anioCumpleanos: 2026,
      persona,
    };

    it('should look for unused cupones that expire within the configured days', async () => {
      prisma.cupon.findMany.mockResolvedValue([]);
      await service.enviarRecordatorios();

      expect(prisma.cupon.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          origen: 'CUMPLEANOS',
          activo: true,
          recordatorioEnviadoEn: null,
          vigenteHasta: { gte: expect.any(Date), lte: new Date('2026-11-13T02:59:59.999Z') }, // hoy + 2 días
          createdAt: { lt: new Date('2026-11-10T03:00:00.000Z') }, // no el que se mandó hoy
          turnos: { none: { estado: { not: 'CANCELADO' } } },
          persona: { recibePromociones: true, mail: { not: null } },
        }),
        include: { persona: true },
      });
    });

    it('should send the reminder once and mark it', async () => {
      prisma.cupon.findMany.mockResolvedValue([cuponPorVencer]);
      prisma.cupon.update.mockResolvedValue({});

      await service.enviarRecordatorios();

      expect(mail.sendCuponCumpleanos).toHaveBeenCalledWith(
        'juan@test.com',
        expect.objectContaining({ recordatorio: true, hasta: '11/11', fechaCumple: '13/11', codigo: 'CUMPLE-JUAN-AB12' }),
      );
      expect(prisma.cupon.update).toHaveBeenCalledWith({ where: { idCupon: 3 }, data: { recordatorioEnviadoEn: expect.any(Date) } });
    });

    it('should not mark it if the mail did not go out (it retries the next day)', async () => {
      prisma.cupon.findMany.mockResolvedValue([cuponPorVencer]);
      mail.sendCuponCumpleanos.mockResolvedValue(false);

      await service.enviarRecordatorios();

      expect(prisma.cupon.update).not.toHaveBeenCalled();
    });

    it('should do nothing with 0 days or the beneficio off', async () => {
      prisma.configuracionNegocio.findUnique.mockResolvedValue({ ...configNegocio, cumpleDiasRecordatorio: 0 });
      await service.enviarRecordatorios();
      prisma.configuracionNegocio.findUnique.mockResolvedValue({ ...configNegocio, cumpleActivo: false });
      await service.enviarRecordatorios();
      expect(prisma.cupon.findMany).not.toHaveBeenCalled();
    });
  });

  describe('baja de promociones', () => {
    it('should turn promos off with a valid link', async () => {
      prisma.persona.findUnique.mockResolvedValue(persona);
      prisma.persona.update.mockResolvedValue({ ...persona, recibePromociones: false });

      await expect(service.setPreferencia(generarTokenBaja(5, 'secreto'), false)).resolves.toEqual({ nombre: 'Juan', recibePromociones: false });
      expect(prisma.persona.update).toHaveBeenCalledWith({ where: { idPersona: 5 }, data: { recibePromociones: false } });
    });

    it('should reject an invalid link', async () => {
      await expect(service.getPreferencia('5.trucho')).rejects.toThrow(NotFoundException);
    });
  });
});
