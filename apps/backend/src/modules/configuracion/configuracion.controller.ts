import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { ConfiguracionService } from './configuracion.service';
import { UpdateConfiguracionDto } from './dto/update-configuracion.dto';
import { ConfiguracionNegocio } from '@prisma/client';

@ApiTags('Configuración')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('configuracion')
export class ConfiguracionController {
  constructor(private readonly configuracionService: ConfiguracionService) {}

  @Get('branding')
  @Public()
  @ApiOperation({ summary: 'Obtener la configuración pública del negocio (marca + landing: nombre, logo, colores, hero, contacto, horarios, etc.)' })
  @ApiResponse({ status: 200, description: 'Configuración actual (valores por defecto si no fue configurada)' })
  async getBranding(): Promise<ConfiguracionNegocio> {
    return this.configuracionService.getBranding();
  }

  @Put('branding')
  @ApiOperation({ summary: 'Actualizar la configuración del negocio (marca + landing)' })
  @ApiResponse({ status: 200, description: 'Configuración actualizada' })
  async updateBranding(@Body() dto: UpdateConfiguracionDto): Promise<ConfiguracionNegocio> {
    return this.configuracionService.updateBranding(dto);
  }
}
