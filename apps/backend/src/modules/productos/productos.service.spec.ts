import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProductosService } from './productos.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaServiceMock } from '../../../test/mocks/prisma.service.mock';
import { CreateProductoDto } from './dto/create-producto.dto';
import { Producto } from '@prisma/client';

describe('ProductosService', () => {
  let service: ProductosService;
  let prismaMock: PrismaServiceMock;

  const mockProducto: Producto = {
    idProducto: 1,
    nombre: 'Cera moldeadora',
    descripcion: 'Fijación fuerte',
    precio: 4500 as any,
    urlImagen: 'https://example.com/cera.jpg',
    idCategoria: 1,
    vigente: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prismaMock = new PrismaServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductosService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = module.get<ProductosService>(ProductosService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a product with default vigente=true', async () => {
      const dto: CreateProductoDto = { nombre: 'Cera moldeadora', precio: 4500 };
      prismaMock.producto.create.mockResolvedValue({ ...mockProducto, ...dto });

      const result = await service.create(dto);

      expect(prismaMock.producto.create).toHaveBeenCalledWith({
        data: {
          nombre: dto.nombre,
          descripcion: dto.descripcion,
          precio: dto.precio,
          urlImagen: dto.urlImagen,
          idCategoria: dto.idCategoria,
          vigente: true,
        },
      });
      expect(result.nombre).toBe('Cera moldeadora');
    });
  });

  describe('findAll', () => {
    it('should filter by idCategoria', async () => {
      prismaMock.producto.findMany.mockResolvedValue([mockProducto]);
      prismaMock.producto.count.mockResolvedValue(1);

      const result = await service.findAll(undefined, 1);

      expect(prismaMock.producto.findMany).toHaveBeenCalledWith({
        where: { idCategoria: 1 },
        include: { categoria: true },
        orderBy: { nombre: 'asc' },
        skip: 0,
        take: 20,
      });
      expect(result.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when product does not exist', async () => {
      prismaMock.producto.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should mark product as not vigente (soft delete)', async () => {
      prismaMock.producto.findUnique.mockResolvedValue(mockProducto);
      prismaMock.producto.update.mockResolvedValue({ ...mockProducto, vigente: false });

      const result = await service.remove(1);

      expect(prismaMock.producto.update).toHaveBeenCalledWith({
        where: { idProducto: 1 },
        data: { vigente: false },
      });
      expect(result.vigente).toBe(false);
    });
  });
});
