import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TurnosService } from './turnos.service';
import { CreateTurnoDto } from './dto/create-turno.dto';
import { UpdateTurnoDto } from './dto/update-turno.dto';

@ApiTags('Turnos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('turnos')
export class TurnosController {
  constructor(private readonly turnosService: TurnosService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo turno' })
  @ApiResponse({ status: 201, description: 'Turno creado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o horario no disponible' })
  async create(@Body() createTurnoDto: CreateTurnoDto) {
    return this.turnosService.create(createTurnoDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los turnos' })
  @ApiQuery({ name: 'fechaDesde', required: false, description: 'Fecha desde (ISO 8601)' })
  @ApiQuery({ name: 'fechaHasta', required: false, description: 'Fecha hasta (ISO 8601)' })
  @ApiResponse({ status: 200, description: 'Lista de turnos' })
  async findAll(
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    return this.turnosService.findAll(fechaDesde, fechaHasta);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un turno por ID' })
  @ApiResponse({ status: 200, description: 'Turno encontrado' })
  @ApiResponse({ status: 404, description: 'Turno no encontrado' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.turnosService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un turno (solo PENDIENTE o CONFIRMADO)' })
  @ApiResponse({ status: 200, description: 'Turno actualizado' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTurnoDto: UpdateTurnoDto,
  ) {
    return this.turnosService.update(id, updateTurnoDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar un turno' })
  @ApiResponse({ status: 200, description: 'Turno cancelado' })
  async cancelar(@Param('id', ParseIntPipe) id: number) {
    return this.turnosService.cancelar(id);
  }

  // Transiciones de estado (Patrón State)
  @Post(':id/confirmar')
  @ApiOperation({ summary: 'Confirmar un turno (PENDIENTE -> CONFIRMADO)' })
  @ApiResponse({ status: 200, description: 'Turno confirmado' })
  async confirmar(@Param('id', ParseIntPipe) id: number) {
    return this.turnosService.confirmar(id);
  }

  @Post(':id/iniciar')
  @ApiOperation({ summary: 'Iniciar atención (CONFIRMADO -> EN_PROCESO)' })
  @ApiResponse({ status: 200, description: 'Atención iniciada' })
  async iniciar(@Param('id', ParseIntPipe) id: number) {
    return this.turnosService.iniciarAtencion(id);
  }

  @Post(':id/finalizar')
  @ApiOperation({ summary: 'Finalizar atención (EN_PROCESO -> COMPLETADO)' })
  @ApiResponse({ status: 200, description: 'Turno finalizado' })
  async finalizar(@Param('id', ParseIntPipe) id: number) {
    return this.turnosService.finalizar(id);
  }

  @Post(':id/pagar')
  @ApiOperation({ summary: 'Marcar como pagado (COMPLETADO)' })
  @ApiResponse({ status: 200, description: 'Turno pagado' })
  async pagar(@Param('id', ParseIntPipe) id: number) {
    return this.turnosService.registrarPago(id);
  }

  @Post(':id/no-show')
  @ApiOperation({ summary: 'Marcar como no-show (CONFIRMADO -> NO_SHOW)' })
  @ApiResponse({ status: 200, description: 'Marcado como no-show' })
  async noShow(@Param('id', ParseIntPipe) id: number) {
    return this.turnosService.marcarNoShow(id);
  }

  @Get(':id/total')
  @ApiOperation({ summary: 'Calcular total del turno' })
  @ApiResponse({ status: 200, description: 'Total calculado' })
  async calcularTotal(@Param('id', ParseIntPipe) id: number) {
    const total = await this.turnosService.calcularTotal(id);
    return { total, idTurno: id };
  }
}
