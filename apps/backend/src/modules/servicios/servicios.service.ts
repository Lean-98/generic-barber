import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Servicio } from '@prisma/client';
import { CreateServicioDto } from './dto/create-servicio.dto';
import { UpdateServicioDto } from './dto/update-servicio.dto';

@Injectable()
export class ServiciosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateServicioDto): Promise<Servicio> {
    return this.prisma.servicio.create({
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        precio: data.precio,
        duracionMinutos: data.duracionMinutos,
        urlImagen: data.urlImagen,
        vigente: data.vigente ?? true,
      },
    });
  }

  async findAll(vigente?: boolean): Promise<Servicio[]> {
    const where = vigente !== undefined ? { vigente } : {};
    return this.prisma.servicio.findMany({
      where,
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: number): Promise<Servicio> {
    const servicio = await this.prisma.servicio.findUnique({
      where: { idServicio: id },
    });

    if (!servicio) {
      throw new NotFoundException(`Servicio con id ${id} no encontrado`);
    }

    return servicio;
  }

  async update(id: number, data: UpdateServicioDto): Promise<Servicio> {
    await this.findOne(id); // Verifica que existe

    return this.prisma.servicio.update({
      where: { idServicio: id },
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        precio: data.precio,
        duracionMinutos: data.duracionMinutos,
        urlImagen: data.urlImagen,
        vigente: data.vigente,
      },
    });
  }

  async remove(id: number): Promise<Servicio> {
    await this.findOne(id); // Verifica que existe

    // Eliminación lógica: marcamos como no vigente
    return this.prisma.servicio.update({
      where: { idServicio: id },
      data: { vigente: false },
    });
  }
}
