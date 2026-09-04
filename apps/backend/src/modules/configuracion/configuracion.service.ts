import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfiguracionNegocio, Prisma } from '@prisma/client';
import { UpdateConfiguracionDto } from './dto/update-configuracion.dto';

const CONFIG_ID = 1;
const NOMBRES_DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
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
  clubNombre: null,
  clubBajada: null,
  clubImagenUrl: null,
  clubNota: null,
  mostrarNosotros: true,
  mostrarClub: true,
  mostrarTienda: true,
  mostrarCursos: true,
  mostrarServicios: true,
  mostrarGaleria: true,
  mostrarUbicacion: true,
  clubBeneficios: null,
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
    this.validarHorarios(dto.horarios);
    const data = this.sanitize(dto);
    return this.prisma.configuracionNegocio.upsert({
      where: { id: CONFIG_ID },
      update: data,
      create: { id: CONFIG_ID, ...data },
    });
  }

  // Los inputs de hora son de tipeo libre (type="time"); sin esta validación
  // un cierre cargado antes de la apertura (ej. AM/PM confundido) se guarda
  // silenciosamente y esa franja queda sin turnos disponibles, sin ningún
  // error visible para el negocio.
  private validarHorarios(horarios: UpdateConfiguracionDto['horarios']): void {
    if (!horarios) return;

    for (const dia of horarios) {
      if (dia.cerrado) continue;
      const nombreDia = NOMBRES_DIA[dia.dia] ?? `día ${dia.dia}`;

      if (dia.abre && dia.cierra && dia.cierra <= dia.abre) {
        throw new BadRequestException(
          `El horario del ${nombreDia} es inválido: el cierre (${dia.cierra}) debe ser posterior a la apertura (${dia.abre})`,
        );
      }
      if (dia.abre2 && dia.cierra2 && dia.cierra2 <= dia.abre2) {
        throw new BadRequestException(
          `El segundo turno del ${nombreDia} es inválido: el cierre (${dia.cierra2}) debe ser posterior a la apertura (${dia.abre2})`,
        );
      }
    }
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
