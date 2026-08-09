import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfiguracionNegocio } from '@prisma/client';
import { UpdateConfiguracionDto } from './dto/update-configuracion.dto';

const CONFIG_ID = 1;
const DEFAULT_BRANDING: ConfiguracionNegocio = {
  id: CONFIG_ID,
  nombre: 'Peluquería',
  logoUrl: null,
  iconoUrl: null,
  colorPrimario: null,
  colorSecundario: null,
  updatedAt: new Date(0),
};

@Injectable()
export class ConfiguracionService {
  constructor(private readonly prisma: PrismaService) {}

  async getBranding(): Promise<ConfiguracionNegocio> {
    const config = await this.prisma.configuracionNegocio.findUnique({ where: { id: CONFIG_ID } });
    return config ?? DEFAULT_BRANDING;
  }

  async updateBranding(dto: UpdateConfiguracionDto): Promise<ConfiguracionNegocio> {
    const data = this.sanitize(dto);
    return this.prisma.configuracionNegocio.upsert({
      where: { id: CONFIG_ID },
      update: data,
      create: { id: CONFIG_ID, ...data },
    });
  }

  private sanitize(dto: UpdateConfiguracionDto): Record<string, string | null> {
    const clean: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(dto)) {
      if (value === undefined) continue;
      clean[key] = value === '' ? null : value;
    }
    return clean;
  }
}
