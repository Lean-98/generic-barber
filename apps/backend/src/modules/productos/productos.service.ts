import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Producto } from '@prisma/client';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { PaginatedResult, paginar } from '../../common/interfaces/paginated-result.interface';

@Injectable()
export class ProductosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateProductoDto): Promise<Producto> {
    return this.prisma.producto.create({
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        precio: data.precio,
        urlImagen: data.urlImagen,
        idCategoria: data.idCategoria,
        vigente: data.vigente ?? true,
      },
    });
  }

  async findAll(vigente?: boolean, idCategoria?: number, page = 1, limit = 20): Promise<PaginatedResult<Producto>> {
    const where: Prisma.ProductoWhereInput = {};
    if (vigente !== undefined) where.vigente = vigente;
    if (idCategoria !== undefined) where.idCategoria = idCategoria;

    const [data, total] = await Promise.all([
      this.prisma.producto.findMany({
        where,
        include: { categoria: true },
        orderBy: { nombre: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.producto.count({ where }),
    ]);
    return paginar(data, total, page, limit);
  }

  async findOne(id: number): Promise<Producto> {
    const producto = await this.prisma.producto.findUnique({
      where: { idProducto: id },
      include: { categoria: true },
    });

    if (!producto) {
      throw new NotFoundException(`Producto con id ${id} no encontrado`);
    }

    return producto;
  }

  async update(id: number, data: UpdateProductoDto): Promise<Producto> {
    await this.findOne(id);

    return this.prisma.producto.update({
      where: { idProducto: id },
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        precio: data.precio,
        urlImagen: data.urlImagen,
        idCategoria: data.idCategoria,
        vigente: data.vigente,
      },
    });
  }

  async remove(id: number): Promise<Producto> {
    await this.findOne(id);

    return this.prisma.producto.update({
      where: { idProducto: id },
      data: { vigente: false },
    });
  }
}
