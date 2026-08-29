import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Servicio } from '@prisma/client';
import { CreateServicioDto } from './dto/create-servicio.dto';
import { UpdateServicioDto } from './dto/update-servicio.dto';
import { PaginatedResult, paginar } from '../../common/interfaces/paginated-result.interface';

@Injectable()
export class ServiciosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateServicioDto): Promise<Servicio> {
    const servicio = await this.prisma.servicio.create({
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        idCategoria: data.idCategoria,
        precio: data.precio,
        duracionMinutos: data.duracionMinutos,
        urlImagen: data.urlImagen,
        vigente: data.vigente ?? true,
        cuentaParaFidelizacion: data.cuentaParaFidelizacion ?? false,
      },
    });

    await this.prisma.servicioHistorial.create({
      data: {
        idServicio: servicio.idServicio,
        precio: data.precio,
        duracionMinutos: data.duracionMinutos,
        vigente: data.vigente ?? true,
      },
    });

    return servicio;
  }

  async findAll(vigente?: boolean, idCategoria?: number, page = 1, limit = 20): Promise<PaginatedResult<Servicio>> {
    const where: Prisma.ServicioWhereInput = {};
    if (vigente !== undefined) where.vigente = vigente;
    if (idCategoria !== undefined) where.idCategoria = idCategoria;

    const [data, total] = await Promise.all([
      this.prisma.servicio.findMany({
        where,
        include: { categoria: true },
        orderBy: { nombre: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.servicio.count({ where }),
    ]);
    return paginar(data, total, page, limit);
  }

  async findOne(id: number): Promise<Servicio & { historial: any[] }> {
    const servicio = await this.prisma.servicio.findUnique({
      where: { idServicio: id },
      include: {
        categoria: true,
        historial: {
          orderBy: { fechaCambio: 'desc' },
        },
      },
    });

    if (!servicio) {
      throw new NotFoundException(`Servicio con id ${id} no encontrado`);
    }

    return servicio;
  }

  async update(id: number, data: UpdateServicioDto): Promise<Servicio> {
    const actual = await this.findOne(id);

    const servicio = await this.prisma.servicio.update({
      where: { idServicio: id },
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        idCategoria: data.idCategoria,
        precio: data.precio,
        duracionMinutos: data.duracionMinutos,
        urlImagen: data.urlImagen,
        vigente: data.vigente,
        cuentaParaFidelizacion: data.cuentaParaFidelizacion,
      },
    });

    // Guardar historial solo si cambió precio, duración o vigencia
    const cambioPrecio = data.precio !== undefined && data.precio !== Number(actual.precio);
    const cambioDuracion = data.duracionMinutos !== undefined && data.duracionMinutos !== actual.duracionMinutos;
    const cambioVigencia = data.vigente !== undefined && data.vigente !== actual.vigente;

    if (cambioPrecio || cambioDuracion || cambioVigencia) {
      await this.prisma.servicioHistorial.create({
        data: {
          idServicio: id,
          precio: data.precio ?? actual.precio,
          duracionMinutos: data.duracionMinutos ?? actual.duracionMinutos,
          vigente: data.vigente ?? actual.vigente,
        },
      });
    }

    return servicio;
  }

  async remove(id: number): Promise<Servicio> {
    await this.findOne(id);

    // Eliminación lógica: marcamos como no vigente
    const servicio = await this.prisma.servicio.update({
      where: { idServicio: id },
      data: { vigente: false },
    });

    await this.prisma.servicioHistorial.create({
      data: {
        idServicio: id,
        precio: servicio.precio,
        duracionMinutos: servicio.duracionMinutos,
        vigente: false,
      },
    });

    return servicio;
  }
}
