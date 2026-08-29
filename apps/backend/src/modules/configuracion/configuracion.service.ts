import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfiguracionNegocio, Prisma } from '@prisma/client';
import { UpdateConfiguracionDto } from './dto/update-configuracion.dto';

const CONFIG_ID = 1;
const DEFAULT_CONFIG: ConfiguracionNegocio = {
  id: CONFIG_ID,
  nombre: 'Peluquería',
  logoUrl: null,
  iconoUrl: null,
  colorPrimario: null,
  colorSecundario: null,
  heroImageUrl: null,
  descripcion: null,
  telefono: null,
  email: null,
  direccion: null,
  instagramUrl: null,
  facebookUrl: null,
  googleReviewsUrl: null,
  whatsappUrl: null,
  politicaReservas: null,
  horarios: null,
  galeriaUrls: null,
  productosTitulo: null,
  productosDescripcion: null,
  cursosTitulo: null,
  cursosDescripcion: null,
  sobreNosotros: null,
  sobreNosotrosBajada: null,
  authenticClubNombre: null,
  authenticClubBajada: null,
  authenticClubImagenUrl: null,
  authenticClubNota: null,
  mostrarNosotros: true,
  mostrarAuthenticClub: true,
  mostrarTienda: true,
  mostrarCursos: true,
  mostrarServicios: true,
  mostrarGaleria: true,
  mostrarUbicacion: true,
  authenticClubBeneficios: null,
  fidelizacionActiva: false,
  fidelizacionVisitasRequeridas: null,
  fidelizacionDescuentoPorcentaje: null,
  fidelizacionFechaInicio: null,
  descuentoEmpleadoActivo: false,
  descuentoEmpleadoPorcentaje: null,
  updatedAt: new Date(0),
};

@Injectable()
export class ConfiguracionService {
  constructor(private readonly prisma: PrismaService) {}

  async getBranding(): Promise<ConfiguracionNegocio> {
    const config = await this.prisma.configuracionNegocio.findUnique({ where: { id: CONFIG_ID } });
    return config ?? DEFAULT_CONFIG;
  }

  async updateBranding(dto: UpdateConfiguracionDto): Promise<ConfiguracionNegocio> {
    const data = this.sanitize(dto);
    return this.prisma.configuracionNegocio.upsert({
      where: { id: CONFIG_ID },
      update: data,
      create: { id: CONFIG_ID, ...data },
    });
  }

  private sanitize(
    dto: UpdateConfiguracionDto,
  ): Prisma.ConfiguracionNegocioUpdateInput & Prisma.ConfiguracionNegocioCreateInput {
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(dto)) {
      if (value === undefined) continue;
      if (key === 'fidelizacionFechaInicio') {
        clean[key] = value === '' ? null : new Date(value as string);
        continue;
      }
      clean[key] = value === '' ? null : value;
    }
    return clean as Prisma.ConfiguracionNegocioUpdateInput & Prisma.ConfiguracionNegocioCreateInput;
  }
}
