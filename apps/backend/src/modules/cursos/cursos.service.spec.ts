import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CursosService } from './cursos.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaServiceMock } from '../../../test/mocks/prisma.service.mock';
import { CreateCursoDto } from './dto/create-curso.dto';
import { Curso } from '@prisma/client';

describe('CursosService', () => {
  let service: CursosService;
  let prismaMock: PrismaServiceMock;

  const mockCurso: Curso = {
    idCurso: 1,
    nombre: 'Barbería profesional',
    descripcion: 'Formación integral',
    precio: 60000 as any,
    duracion: '8 semanas',
    urlImagen: 'https://example.com/curso.jpg',
    vigente: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prismaMock = new PrismaServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [CursosService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = module.get<CursosService>(CursosService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a course with default vigente=true', async () => {
      const dto: CreateCursoDto = { nombre: 'Barbería profesional', precio: 60000 };
      prismaMock.curso.create.mockResolvedValue({ ...mockCurso, ...dto });

      const result = await service.create(dto);

      expect(prismaMock.curso.create).toHaveBeenCalledWith({
        data: {
          nombre: dto.nombre,
          descripcion: dto.descripcion,
          precio: dto.precio,
          duracion: dto.duracion,
          urlImagen: dto.urlImagen,
          vigente: true,
        },
      });
      expect(result.nombre).toBe('Barbería profesional');
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when course does not exist', async () => {
      prismaMock.curso.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should mark course as not vigente (soft delete)', async () => {
      prismaMock.curso.findUnique.mockResolvedValue(mockCurso);
      prismaMock.curso.update.mockResolvedValue({ ...mockCurso, vigente: false });

      const result = await service.remove(1);

      expect(prismaMock.curso.update).toHaveBeenCalledWith({
        where: { idCurso: 1 },
        data: { vigente: false },
      });
      expect(result.vigente).toBe(false);
    });
  });
});
