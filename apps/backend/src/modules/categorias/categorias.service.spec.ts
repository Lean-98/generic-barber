import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CategoriasService } from './categorias.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaServiceMock } from '../../../test/mocks/prisma.service.mock';
import { Categoria } from '@prisma/client';

describe('CategoriasService', () => {
  let service: CategoriasService;
  let prismaMock: PrismaServiceMock;

  const mockCategoria: Categoria = {
    idCategoria: 1,
    nombre: 'Cuidado de barba',
    vigente: true,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    prismaMock = new PrismaServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoriasService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = module.get<CategoriasService>(CategoriasService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a category with default vigente=true', async () => {
      prismaMock.categoria.create.mockResolvedValue(mockCategoria);

      const result = await service.create({ nombre: 'Cuidado de barba' });

      expect(prismaMock.categoria.create).toHaveBeenCalledWith({
        data: { nombre: 'Cuidado de barba', vigente: true },
      });
      expect(result.nombre).toBe('Cuidado de barba');
    });
  });

  describe('findAll', () => {
    it('should return all categories when no filter is provided', async () => {
      prismaMock.categoria.findMany.mockResolvedValue([mockCategoria]);

      const result = await service.findAll();

      expect(prismaMock.categoria.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: { nombre: 'asc' },
      });
      expect(result).toHaveLength(1);
    });

    it('should filter by vigente=true', async () => {
      prismaMock.categoria.findMany.mockResolvedValue([mockCategoria]);

      await service.findAll(true);

      expect(prismaMock.categoria.findMany).toHaveBeenCalledWith({
        where: { vigente: true },
        orderBy: { nombre: 'asc' },
      });
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when category does not exist', async () => {
      prismaMock.categoria.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should mark category as not vigente (soft delete)', async () => {
      prismaMock.categoria.findUnique.mockResolvedValue(mockCategoria);
      prismaMock.categoria.update.mockResolvedValue({ ...mockCategoria, vigente: false });

      const result = await service.remove(1);

      expect(prismaMock.categoria.update).toHaveBeenCalledWith({
        where: { idCategoria: 1 },
        data: { vigente: false },
      });
      expect(result.vigente).toBe(false);
    });
  });
});
