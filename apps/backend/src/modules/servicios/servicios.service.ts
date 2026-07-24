import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Servicio } from '@prisma/client';
import { CreateServicioDto } from './dto/create-servicio.dto';
import { UpdateServicioDto } from './dto/update-servicio.dto';

@Injectable()
export class ServiciosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateServicioDto): Promise<Servicio> {
    const servicio = await this.prisma.servicio.create({
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        categoria: data.categoria,
        precio: data.precio,
        duracionMinutos: data.duracionMinutos,
        urlImagen: data.urlImagen,
        vigente: data.vigente ?? true,
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

  async findAll(vigente?: boolean, categoria?: string): Promise<Servicio[]> {
    const where: any = {};
    if (vigente !== undefined) where.vigente = vigente;
    if (categoria) where.categoria = { equals: categoria, mode: 'insensitive' };
    return this.prisma.servicio.findMany({
      where,
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: number): Promise<Servicio & { historial: any[] }> {
    const servicio = await this.prisma.servicio.findUnique({
      where: { idServicio: id },
      include: {
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
        categoria: data.categoria,
        precio: data.precio,
        duracionMinutos: data.duracionMinutos,
        urlImagen: data.urlImagen,
        vigente: data.vigente,
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

  async findCategorias(): Promise<string[]> {
    const resultados = await this.prisma.servicio.findMany({
      distinct: ['categoria'],
      where: { categoria: { not: null } },
      select: { categoria: true },
    });
    return resultados.map((s) => s.categoria).filter((c): c is string => c !== null);
  }
}
