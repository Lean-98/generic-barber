import { Controller, Get, Post, Query, Body, BadRequestException, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { TurnosService } from './turnos.service';
import { ReservaPublicaDto, DisponibilidadQueryDto } from './dto/reserva-publica.dto';
import { CancelacionPublicaDto } from './dto/cancelacion-publica.dto';

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

  @Get('formas-pago')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Listar formas de pago vigentes, para el selector de la reserva pública' })
  @ApiResponse({ status: 200, description: 'Lista de formas de pago' })
  async listarFormasPago() {
    return this.turnosService.listarFormasPago();
  }

  @Get('cliente')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Verificar si un email ya pertenece a un cliente registrado, para saltear el formulario de datos' })
  @ApiResponse({ status: 200, description: '{ existe: boolean, nombre?: string }' })
  async buscarCliente(@Query('email') email: string) {
    if (!email) {
      throw new BadRequestException('email es requerido');
    }
    return this.turnosService.buscarClientePorEmail(email);
  }

  @Post('reservar')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Reservar un turno desde el sitio público (cliente)' })
  @ApiResponse({ status: 201, description: 'Turno reservado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o horario no disponible' })
  async reservar(@Body() dto: ReservaPublicaDto) {
    return this.turnosService.reservarPublica(dto);
  }

  @Get('cancelacion')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Ver el turno al que apunta un link de cancelación (página pública)' })
  @ApiResponse({ status: 200, description: 'Datos del turno y si todavía se puede cancelar' })
  @ApiResponse({ status: 404, description: 'Link inválido' })
  async getCancelacion(@Query() query: CancelacionPublicaDto) {
    return this.turnosService.getTurnoParaCancelar(query.token);
  }

  @Post('cancelar')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Cancelar un turno desde el link del mail (cliente)' })
  @ApiResponse({ status: 200, description: 'Turno cancelado (o ya estaba cancelado)' })
  @ApiResponse({ status: 400, description: 'El turno ya no se puede cancelar' })
  @ApiResponse({ status: 404, description: 'Link inválido' })
  async cancelar(@Body() dto: CancelacionPublicaDto) {
    return this.turnosService.cancelarPorCliente(dto.token);
  }
}
