import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ServiciosService } from './servicios.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaServiceMock } from '../../../test/mocks/prisma.service.mock';
import { CreateServicioDto } from './dto/create-servicio.dto';
import { UpdateServicioDto } from './dto/update-servicio.dto';
import { Servicio } from '@prisma/client';

/**
 * Test Unitario: ServiciosService
 * 
 * Principios aplicados:
 * - SRP: Solo testeamos la lógica de ServiciosService
 * - DIP: Inyectamos un mock de PrismaService, no la implementación real
 * - KISS: Tests simples, un solo concepto por test
 * - DRY: Reutilizamos mockServicio base
 */
describe('ServiciosService', () => {
  let service: ServiciosService;
  let prismaMock: PrismaServiceMock;

  // Mock de un servicio base para reutilizar en tests
  const mockServicio: Servicio = {
    idServicio: 1,
    nombre: 'Corte de cabello',
    descripcion: 'Corte clásico para caballero',
    categoria: 'Cortes',
    precio: 25.00 as any, // Prisma Decimal
    duracionMinutos: 30,
    urlImagen: 'https://example.com/corte.jpg',
    vigente: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prismaMock = new PrismaServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiciosService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<ServiciosService>(ServiciosService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new service with default vigente=true', async () => {
      // Arrange
      const dto: CreateServicioDto = {
        nombre: 'Corte de cabello',
        descripcion: 'Corte clásico',
        precio: 25.00,
        duracionMinutos: 30,
      };

      prismaMock.servicio.create.mockResolvedValue({
        ...mockServicio,
        ...dto,
      });

      // Act
      const result = await service.create(dto);

      // Assert
      expect(prismaMock.servicio.create).toHaveBeenCalledWith({
        data: {
          nombre: dto.nombre,
          descripcion: dto.descripcion,
          categoria: dto.categoria,
          precio: dto.precio,
          duracionMinutos: dto.duracionMinutos,
          urlImagen: dto.urlImagen,
          vigente: true,
        },
      });
      expect(result).toBeDefined();
      expect(result.nombre).toBe('Corte de cabello');
    });
  });

  describe('findAll', () => {
    it('should return all services when no filter is provided', async () => {
      // Arrange
      const servicios = [mockServicio, { ...mockServicio, idServicio: 2 }];
      prismaMock.servicio.findMany.mockResolvedValue(servicios);
      prismaMock.servicio.count.mockResolvedValue(2);

      // Act
      const result = await service.findAll();

      // Assert
      expect(prismaMock.servicio.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { nombre: 'asc' },
        skip: 0,
        take: 20,
      });
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter by vigente=true', async () => {
      // Arrange
      const servicios = [mockServicio];
      prismaMock.servicio.findMany.mockResolvedValue(servicios);
      prismaMock.servicio.count.mockResolvedValue(1);

      // Act
      const result = await service.findAll(true);

      // Assert
      expect(prismaMock.servicio.findMany).toHaveBeenCalledWith({
        where: { vigente: true },
        orderBy: { nombre: 'asc' },
        skip: 0,
        take: 20,
      });
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return a service by id', async () => {
      // Arrange
      prismaMock.servicio.findUnique.mockResolvedValue({
        ...mockServicio,
        historial: [],
      });

      // Act
      const result = await service.findOne(1);

      // Assert
      expect(prismaMock.servicio.findUnique).toHaveBeenCalledWith({
        where: { idServicio: 1 },
        include: {
          historial: {
            orderBy: { fechaCambio: 'desc' },
          },
        },
      });
      expect(result.idServicio).toBe(1);
    });

    it('should throw NotFoundException when service does not exist', async () => {
      // Arrange
      prismaMock.servicio.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      expect(prismaMock.servicio.findUnique).toHaveBeenCalledWith({
        where: { idServicio: 999 },
        include: {
          historial: {
            orderBy: { fechaCambio: 'desc' },
          },
        },
      });
    });
  });

  describe('update', () => {
    it('should update a service', async () => {
      // Arrange
      const dto: UpdateServicioDto = { precio: 30.00 };
      const updated = { ...mockServicio, precio: 30.00 as any };
      
      prismaMock.servicio.findUnique.mockResolvedValue({ ...mockServicio, historial: [] });
      prismaMock.servicio.update.mockResolvedValue(updated);

      // Act
      const result = await service.update(1, dto);

      // Assert
      expect(prismaMock.servicio.findUnique).toHaveBeenCalledWith({
        where: { idServicio: 1 },
        include: {
          historial: {
            orderBy: { fechaCambio: 'desc' },
          },
        },
      });
      expect(prismaMock.servicio.update).toHaveBeenCalledWith({
        where: { idServicio: 1 },
        data: { precio: dto.precio },
      });
      expect(result.precio).toBe(30.00);
    });

    it('should throw NotFoundException when updating non-existent service', async () => {
      // Arrange
      prismaMock.servicio.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update(999, { precio: 30.00 })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should mark service as not vigente (soft delete)', async () => {
      // Arrange
      const deleted = { ...mockServicio, vigente: false };
      
      prismaMock.servicio.findUnique.mockResolvedValue({ ...mockServicio, historial: [] });
      prismaMock.servicio.update.mockResolvedValue(deleted);

      // Act
      const result = await service.remove(1);

      // Assert
      expect(prismaMock.servicio.update).toHaveBeenCalledWith({
        where: { idServicio: 1 },
        data: { vigente: false },
      });
      expect(prismaMock.servicioHistorial.create).toHaveBeenCalled();
      expect(result.vigente).toBe(false);
    });

    it('should throw NotFoundException when removing non-existent service', async () => {
      // Arrange
      prismaMock.servicio.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
