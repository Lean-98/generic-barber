import { Controller, Get, Post, Query, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { TurnosService } from './turnos.service';
import { ReservaPublicaDto, DisponibilidadQueryDto } from './dto/reserva-publica.dto';

@ApiTags('Turnos Públicos')
@Controller('turnos-publicos')
export class TurnosPublicosController {
  constructor(private readonly turnosService: TurnosService) {}

  @Get('disponibilidad')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Consultar slots disponibles para una fecha y servicios' })
  @ApiResponse({ status: 200, description: 'Lista de slots disponibles' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async getDisponibilidad(
    @Query('fecha') fecha: string,
    @Query('servicios') servicios: string,
  ) {
    if (!fecha || !servicios) {
      throw new BadRequestException('fecha y servicios son requeridos');
    }
    return this.turnosService.getDisponibilidad(fecha, servicios);
  }

  @Post('reservar')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Reservar un turno desde el sitio público (cliente)' })
  @ApiResponse({ status: 201, description: 'Turno reservado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o horario no disponible' })
  async reservar(@Body() dto: ReservaPublicaDto) {
    return this.turnosService.reservarPublica(dto);
  }
}
