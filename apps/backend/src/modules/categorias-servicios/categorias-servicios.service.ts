import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CategoriaServicio } from '@prisma/client';
import { CreateCategoriaServicioDto } from './dto/create-categoria-servicio.dto';
import { UpdateCategoriaServicioDto } from './dto/update-categoria-servicio.dto';

@Injectable()
export class CategoriasServiciosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCategoriaServicioDto): Promise<CategoriaServicio> {
    return this.prisma.categoriaServicio.create({
      data: {
        nombre: data.nombre,
        vigente: data.vigente ?? true,
      },
    });
  }

  async findAll(vigente?: boolean): Promise<CategoriaServicio[]> {
    return this.prisma.categoriaServicio.findMany({
      where: vigente !== undefined ? { vigente } : undefined,
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: number): Promise<CategoriaServicio> {
    const categoria = await this.prisma.categoriaServicio.findUnique({ where: { idCategoria: id } });

    if (!categoria) {
      throw new NotFoundException(`Categoría de servicio con id ${id} no encontrada`);
    }

    return categoria;
  }

  async update(id: number, data: UpdateCategoriaServicioDto): Promise<CategoriaServicio> {
    await this.findOne(id);

    return this.prisma.categoriaServicio.update({
      where: { idCategoria: id },
      data: {
        nombre: data.nombre,
        vigente: data.vigente,
      },
    });
  }

  async remove(id: number): Promise<CategoriaServicio> {
    await this.findOne(id);

    return this.prisma.categoriaServicio.update({
      where: { idCategoria: id },
      data: { vigente: false },
    });
  }
}
