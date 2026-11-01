import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportesService } from './reportes.service';
import { ClientesInactivosQueryDto, CostosNegocioDto } from './dto/costos-negocio.dto';

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

  @Get('clientes-inactivos')
  @ApiOperation({ summary: 'Clientes que no vienen hace más de N días y no tienen turno reservado' })
  @ApiResponse({ status: 200, description: 'Clientes inactivos, los más frecuentes primero' })
  async getClientesInactivos(@Query() query: ClientesInactivosQueryDto) {
    return this.reportesService.getClientesInactivos(query.dias);
  }

  @Get('clientes-sin-visitas')
  @ApiOperation({ summary: 'Clientes registrados que nunca completaron un turno ni tienen uno reservado' })
  @ApiResponse({ status: 200, description: 'Clientes sin visitas, los más recientes primero' })
  async getClientesSinVisitas() {
    return this.reportesService.getClientesSinVisitas();
  }

  @Get('rentabilidad')
  @ApiOperation({ summary: 'Margen, costos y punto de equilibrio del período' })
  @ApiQuery({ name: 'desde', required: false, type: String, description: 'Fecha inicio YYYY-MM-DD' })
  @ApiQuery({ name: 'hasta', required: false, type: String, description: 'Fecha fin YYYY-MM-DD' })
  @ApiResponse({ status: 200, description: 'Reporte de rentabilidad' })
  async getRentabilidad(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.reportesService.getRentabilidad(desde, hasta);
  }

  @Get('costos')
  @ApiOperation({ summary: 'Costos del negocio usados en el reporte de rentabilidad' })
  async getCostos() {
    return this.reportesService.getCostos();
  }

  @Put('costos')
  @ApiOperation({ summary: 'Actualizar los costos del negocio (gastos fijos mensuales y costo por hora)' })
  async updateCostos(@Body() dto: CostosNegocioDto) {
    return this.reportesService.updateCostos(dto);
  }
}
