import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportesService } from './reportes.service';

@ApiTags('Reportes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('resumen')
  @ApiOperation({ summary: 'Resumen general del período' })
  @ApiQuery({ name: 'desde', required: false, type: String, description: 'Fecha inicio YYYY-MM-DD' })
  @ApiQuery({ name: 'hasta', required: false, type: String, description: 'Fecha fin YYYY-MM-DD' })
  @ApiResponse({ status: 200, description: 'Resumen de ingresos, egresos y turnos' })
  async getResumen(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.reportesService.getResumen(desde, hasta);
  }

  @Get('ingresos')
  @ApiOperation({ summary: 'Ingresos, egresos y balance por día' })
  @ApiQuery({ name: 'desde', required: false, type: String, description: 'Fecha inicio YYYY-MM-DD' })
  @ApiQuery({ name: 'hasta', required: false, type: String, description: 'Fecha fin YYYY-MM-DD' })
  @ApiResponse({ status: 200, description: 'Ingresos por día' })
  async getIngresosPorDia(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.reportesService.getIngresosPorDia(desde, hasta);
  }

  @Get('turnos')
  @ApiOperation({ summary: 'Turnos agrupados por estado' })
  @ApiQuery({ name: 'desde', required: false, type: String, description: 'Fecha inicio YYYY-MM-DD' })
  @ApiQuery({ name: 'hasta', required: false, type: String, description: 'Fecha fin YYYY-MM-DD' })
  @ApiResponse({ status: 200, description: 'Turnos por estado' })
  async getTurnosPorEstado(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.reportesService.getTurnosPorEstado(desde, hasta);
  }

  @Get('servicios')
  @ApiOperation({ summary: 'Servicios más solicitados' })
  @ApiQuery({ name: 'desde', required: false, type: String, description: 'Fecha inicio YYYY-MM-DD' })
  @ApiQuery({ name: 'hasta', required: false, type: String, description: 'Fecha fin YYYY-MM-DD' })
  @ApiQuery({ name: 'limite', required: false, type: Number, description: 'Cantidad de resultados' })
  @ApiResponse({ status: 200, description: 'Top servicios' })
  async getServicios(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('limite') limite?: number,
  ) {
    return this.reportesService.getServiciosMasSolicitados(desde, hasta, limite);
  }

  @Get('clientes')
  @ApiOperation({ summary: 'Top clientes por ingresos' })
  @ApiQuery({ name: 'desde', required: false, type: String, description: 'Fecha inicio YYYY-MM-DD' })
  @ApiQuery({ name: 'hasta', required: false, type: String, description: 'Fecha fin YYYY-MM-DD' })
  @ApiQuery({ name: 'limite', required: false, type: Number, description: 'Cantidad de resultados' })
  @ApiResponse({ status: 200, description: 'Top clientes' })
  async getClientes(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('limite') limite?: number,
  ) {
    return this.reportesService.getTopClientes(desde, hasta, limite);
  }

  @Get('formas-pago')
  @ApiOperation({ summary: 'Ingresos por forma de pago' })
  @ApiQuery({ name: 'desde', required: false, type: String, description: 'Fecha inicio YYYY-MM-DD' })
  @ApiQuery({ name: 'hasta', required: false, type: String, description: 'Fecha fin YYYY-MM-DD' })
  @ApiResponse({ status: 200, description: 'Ingresos por forma de pago' })
  async getFormasPago(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.reportesService.getIngresosPorFormaPago(desde, hasta);
  }
}
