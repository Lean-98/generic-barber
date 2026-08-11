import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Persona, Prisma } from '@prisma/client';
import { CreatePersonaDto } from './dto/create-persona.dto';
import { UpdatePersonaDto } from './dto/update-persona.dto';
import { PaginatedResult, paginar } from '../../common/interfaces/paginated-result.interface';

@Injectable()
export class PersonasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePersonaDto): Promise<Persona> {
    return this.prisma.persona.create({
      data: {
        nombre: data.nombre,
        apellido: data.apellido,
        mail: data.mail,
        telefono: data.telefono,
        fechaNacimiento: data.fechaNacimiento ? new Date(data.fechaNacimiento) : undefined,
        instagram: data.instagram,
      },
    });
  }

  async findAll(page = 1, limit = 20): Promise<PaginatedResult<Persona>> {
    const [data, total] = await Promise.all([
      this.prisma.persona.findMany({
        orderBy: { apellido: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.persona.count(),
    ]);
    return paginar(data, total, page, limit);
  }

  async findOne(id: number): Promise<Persona> {
    const persona = await this.prisma.persona.findUnique({
      where: { idPersona: id },
    });

    if (!persona) {
      throw new NotFoundException(`Persona con id ${id} no encontrada`);
    }

    return persona;
  }

  async update(id: number, data: UpdatePersonaDto): Promise<Persona> {
    await this.findOne(id);

    return this.prisma.persona.update({
      where: { idPersona: id },
      data: {
        nombre: data.nombre,
        apellido: data.apellido,
        mail: data.mail,
        telefono: data.telefono,
        fechaNacimiento: data.fechaNacimiento ? new Date(data.fechaNacimiento) : undefined,
        instagram: data.instagram,
      },
    });
  }

  async remove(id: number): Promise<Persona> {
    await this.findOne(id);

    // Soft delete: marcar como no vigente (si tuviéramos campo vigente)
    // Por ahora, como no hay campo vigente en Persona, hacemos hard delete
    // Pero podríamos agregar un campo activo en el futuro
    return this.prisma.persona.delete({
      where: { idPersona: id },
    });
  }

  async searchByName(query: string, page = 1, limit = 20): Promise<PaginatedResult<Persona>> {
    const where: Prisma.PersonaWhereInput = {
      OR: [
        { nombre: { contains: query, mode: 'insensitive' } },
        { apellido: { contains: query, mode: 'insensitive' } },
        { mail: { contains: query, mode: 'insensitive' } },
        { telefono: { contains: query, mode: 'insensitive' } },
      ],
    };
    const [data, total] = await Promise.all([
      this.prisma.persona.findMany({
        where,
        orderBy: { apellido: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.persona.count({ where }),
    ]);
    return paginar(data, total, page, limit);
  }

  async findByInstagram(instagram: string): Promise<Persona | null> {
    return this.prisma.persona.findFirst({
      where: { instagram: { equals: instagram, mode: 'insensitive' } },
    });
  }

  async findTurnos(id: number): Promise<any[]> {
    await this.findOne(id);

    return this.prisma.turno.findMany({
      where: { idPersona: id },
      orderBy: { fechaHoraInicio: 'desc' },
      include: {
        detalles: {
          include: {
            servicio: true,
          },
        },
        pagos: true,
      },
    });
  }
}
