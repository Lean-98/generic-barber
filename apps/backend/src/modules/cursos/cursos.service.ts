import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Curso } from '@prisma/client';
import { CreateCursoDto } from './dto/create-curso.dto';
import { UpdateCursoDto } from './dto/update-curso.dto';
import { PaginatedResult, paginar } from '../../common/interfaces/paginated-result.interface';

@Injectable()
export class CursosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCursoDto): Promise<Curso> {
    return this.prisma.curso.create({
      data: {
        nombre: data.nombre,
        subtitulo: data.subtitulo,
        descripcion: data.descripcion,
        precio: data.precio,
        duracion: data.duracion,
        temario: data.temario ?? [],
        fechaInicio: data.fechaInicio,
        fechaFin: data.fechaFin,
        diaCursada: data.diaCursada ?? [],
        horario: data.horario,
        lugar: data.lugar,
        cupos: data.cupos,
        inscripcionInicio: data.inscripcionInicio,
        inscripcionHasta: data.inscripcionHasta,
        requisitoImportante: data.requisitoImportante,
        urlImagen: data.urlImagen,
        vigente: data.vigente ?? true,
      },
    });
  }

  async findAll(vigente?: boolean, page = 1, limit = 20): Promise<PaginatedResult<Curso>> {
    const where: Prisma.CursoWhereInput = {};
    if (vigente !== undefined) where.vigente = vigente;

    const [data, total] = await Promise.all([
      this.prisma.curso.findMany({
        where,
        orderBy: { nombre: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.curso.count({ where }),
    ]);
    return paginar(data, total, page, limit);
  }

  async findOne(id: number): Promise<Curso> {
    const curso = await this.prisma.curso.findUnique({ where: { idCurso: id } });

    if (!curso) {
      throw new NotFoundException(`Curso con id ${id} no encontrado`);
    }

    return curso;
  }

  async update(id: number, data: UpdateCursoDto): Promise<Curso> {
    await this.findOne(id);

    return this.prisma.curso.update({
      where: { idCurso: id },
      data: {
        nombre: data.nombre,
        subtitulo: data.subtitulo,
        descripcion: data.descripcion,
        precio: data.precio,
        duracion: data.duracion,
        temario: data.temario,
        fechaInicio: data.fechaInicio,
        fechaFin: data.fechaFin,
        diaCursada: data.diaCursada,
        horario: data.horario,
        lugar: data.lugar,
        cupos: data.cupos,
        inscripcionInicio: data.inscripcionInicio,
        inscripcionHasta: data.inscripcionHasta,
        requisitoImportante: data.requisitoImportante,
        urlImagen: data.urlImagen,
        vigente: data.vigente,
      },
    });
  }

  async remove(id: number): Promise<Curso> {
    await this.findOne(id);

    return this.prisma.curso.update({
      where: { idCurso: id },
      data: { vigente: false },
    });
  }
}
