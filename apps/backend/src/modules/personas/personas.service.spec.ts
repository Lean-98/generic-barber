import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PersonasService } from './personas.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaServiceMock } from '../../../test/mocks/prisma.service.mock';
import { CreatePersonaDto } from './dto/create-persona.dto';
import { UpdatePersonaDto } from './dto/update-persona.dto';
import { Persona } from '@prisma/client';

/**
 * Test Unitario: PersonasService
 * 
 * Principios aplicados:
 * - SRP: Solo testeamos la lógica de PersonasService
 * - DIP: Inyectamos un mock de PrismaService
 * - KISS: Tests simples, un solo concepto por test
 * - DRY: Reutilizamos mockPersona base
 */
describe('PersonasService', () => {
  let service: PersonasService;
  let prismaMock: PrismaServiceMock;

  const mockPersona: Persona = {
    idPersona: 1,
    nombre: 'Juan',
    apellido: 'Pérez',
    mail: 'juan@example.com',
    telefono: '+54 11 1234-5678',
    fechaNacimiento: new Date('1990-05-15'),
    instagram: '@juan_perez',
    ultimoCorte: null,
    usuario: null,
    aplicaDescuentoPersonal: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prismaMock = new PrismaServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersonasService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<PersonasService>(PersonasService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new persona', async () => {
      // Arrange
      const dto: CreatePersonaDto = {
        nombre: 'Juan',
        apellido: 'Pérez',
        mail: 'juan@example.com',
        telefono: '+54 11 1234-5678',
        fechaNacimiento: '1990-05-15',
        instagram: '@juan_perez',
      };

      prismaMock.persona.create.mockResolvedValue(mockPersona);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(prismaMock.persona.create).toHaveBeenCalledWith({
        data: {
          nombre: dto.nombre,
          apellido: dto.apellido,
          mail: dto.mail,
          telefono: dto.telefono,
          fechaNacimiento: dto.fechaNacimiento ? new Date(dto.fechaNacimiento) : undefined,
          instagram: dto.instagram,
          aplicaDescuentoPersonal: false,
        },
      });
      expect(result).toBeDefined();
      expect(result.nombre).toBe('Juan');
    });
  });

  describe('findAll', () => {
    it('should return all personas ordered by apellido', async () => {
      // Arrange
      const personas = [mockPersona, { ...mockPersona, idPersona: 2, apellido: 'García' }];
      prismaMock.persona.findMany.mockResolvedValue(personas);
      prismaMock.persona.count.mockResolvedValue(2);

      // Act
      const result = await service.findAll();

      // Assert
      expect(prismaMock.persona.findMany).toHaveBeenCalledWith({
        orderBy: { apellido: 'asc' },
        skip: 0,
        take: 20,
      });
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  describe('findOne', () => {
    it('should return a persona by id', async () => {
      // Arrange
      prismaMock.persona.findUnique.mockResolvedValue(mockPersona);

      // Act
      const result = await service.findOne(1);

      // Assert
      expect(prismaMock.persona.findUnique).toHaveBeenCalledWith({
        where: { idPersona: 1 },
      });
      expect(result.idPersona).toBe(1);
    });

    it('should throw NotFoundException when persona does not exist', async () => {
      // Arrange
      prismaMock.persona.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a persona', async () => {
      // Arrange
      const dto: UpdatePersonaDto = { telefono: '+54 11 9999-8888' };
      const updated = { ...mockPersona, telefono: '+54 11 9999-8888' };
      
      prismaMock.persona.findUnique.mockResolvedValue(mockPersona);
      prismaMock.persona.update.mockResolvedValue(updated);

      // Act
      const result = await service.update(1, dto);

      // Assert
      expect(prismaMock.persona.update).toHaveBeenCalledWith({
        where: { idPersona: 1 },
        data: { telefono: dto.telefono },
      });
      expect(result.telefono).toBe('+54 11 9999-8888');
    });
  });

  describe('remove', () => {
    it('should delete a persona', async () => {
      // Arrange
      prismaMock.persona.findUnique.mockResolvedValue(mockPersona);
      prismaMock.persona.delete.mockResolvedValue(mockPersona);

      // Act
      const result = await service.remove(1);

      // Assert
      expect(prismaMock.persona.delete).toHaveBeenCalledWith({
        where: { idPersona: 1 },
      });
      expect(result.idPersona).toBe(1);
    });
  });

  describe('searchByName', () => {
    it('should search by text query', async () => {
      // Arrange
      prismaMock.persona.findMany.mockResolvedValue([mockPersona]);
      prismaMock.persona.count.mockResolvedValue(1);

      // Act
      const result = await service.searchByName('juan');

      // Assert
      expect(prismaMock.persona.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { nombre: { contains: 'juan', mode: 'insensitive' } },
            { apellido: { contains: 'juan', mode: 'insensitive' } },
            { mail: { contains: 'juan', mode: 'insensitive' } },
            { telefono: { contains: 'juan', mode: 'insensitive' } },
          ],
        },
        orderBy: { apellido: 'asc' },
        skip: 0,
        take: 20,
      });
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findByInstagram', () => {
    it('should find by instagram handle', async () => {
      // Arrange
      prismaMock.persona.findFirst.mockResolvedValue(mockPersona);

      // Act
      const result = await service.findByInstagram('@juan_perez');

      // Assert
      expect(prismaMock.persona.findFirst).toHaveBeenCalledWith({
        where: { instagram: { equals: '@juan_perez', mode: 'insensitive' } },
      });
      expect(result).toBeDefined();
    });
  });
});
