import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Categoria } from '@prisma/client';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';

@Injectable()
export class CategoriasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCategoriaDto): Promise<Categoria> {
    return this.prisma.categoria.create({
      data: {
        nombre: data.nombre,
        vigente: data.vigente ?? true,
      },
    });
  }

  async findAll(vigente?: boolean): Promise<Categoria[]> {
    return this.prisma.categoria.findMany({
      where: vigente !== undefined ? { vigente } : undefined,
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: number): Promise<Categoria> {
    const categoria = await this.prisma.categoria.findUnique({ where: { idCategoria: id } });

    if (!categoria) {
      throw new NotFoundException(`Categoría con id ${id} no encontrada`);
    }

    return categoria;
  }

  async update(id: number, data: UpdateCategoriaDto): Promise<Categoria> {
    await this.findOne(id);

    return this.prisma.categoria.update({
      where: { idCategoria: id },
      data: {
        nombre: data.nombre,
        vigente: data.vigente,
      },
    });
  }

  async remove(id: number): Promise<Categoria> {
    await this.findOne(id);

    return this.prisma.categoria.update({
      where: { idCategoria: id },
      data: { vigente: false },
    });
  }
}
