import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CajaService } from './caja.service';
import { CreatePagoDto } from './dto/create-pago.dto';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import { ConfirmarCierreDto } from './dto/confirmar-cierre.dto';

@ApiTags('Caja')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('caja')
export class CajaController {
  constructor(private readonly cajaService: CajaService) {}

  // Formas de pago
  @Get('formas-pago')
  @ApiOperation({ summary: 'Obtener formas de pago vigentes' })
  @ApiResponse({ status: 200, description: 'Lista de formas de pago' })
  async findFormasPago() {
    return this.cajaService.movimientos.findFormasPago();
  }

  // Pagos
  @Post('pagos')
  @ApiOperation({ summary: 'Registrar un pago (usa Facade)' })
  @ApiResponse({ status: 201, description: 'Pago registrado, movimiento creado' })
  async procesarPago(
    @Body() dto: CreatePagoDto,
    @CurrentUser() user: any,
  ) {
    return this.cajaService.facade.procesarPago(dto, user.usuario);
  }

  @Get('pagos/turno/:idTurno')
  @ApiOperation({ summary: 'Listar pagos de un turno' })
  async findPagosByTurno(@Param('idTurno', ParseIntPipe) idTurno: number) {
    return this.cajaService.pagos.findByTurno(idTurno);
  }

  // Movimientos
  @Post('movimientos')
  @ApiOperation({ summary: 'Registrar un movimiento de caja manual' })
  @ApiResponse({ status: 201, description: 'Movimiento registrado' })
  async createMovimiento(
    @Body() dto: CreateMovimientoDto,
    @CurrentUser() user: any,
  ) {
    return this.cajaService.movimientos.create({
      ...dto,
      idUsuario: user.usuario,
    });
  }

  @Get('movimientos')
  @ApiOperation({ summary: 'Listar movimientos del día' })
  async findMovimientos(@Query('fecha') fecha?: string) {
    const date = fecha ? new Date(fecha) : new Date();
    return this.cajaService.movimientos.findByFecha(date);
  }

  @Get('movimientos/totales')
  @ApiOperation({ summary: 'Totales de ingresos y egresos del día' })
  async getTotales(@Query('fecha') fecha?: string) {
    const date = fecha ? new Date(fecha) : new Date();
    const [ingresos, egresos] = await Promise.all([
      this.cajaService.movimientos.calcularTotalIngresos(date),
      this.cajaService.movimientos.calcularTotalEgresos(date),
    ]);
    return { fecha: date.toISOString().split('T')[0], ingresos, egresos, balance: ingresos - egresos };
  }

  // Cierre de caja
  @Post('cierre/iniciar')
  @ApiOperation({ summary: 'Iniciar cierre de caja (calcula totales esperados)' })
  @ApiResponse({ status: 201, description: 'Cierre iniciado' })
  async iniciarCierre(
    @Query('fecha') fecha: string,
    @CurrentUser() user: any,
  ) {
    return this.cajaService.cierre.iniciarCierre(new Date(fecha), user.usuario);
  }

  @Post('cierre/confirmar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirmar cierre de caja (ingresa conteo real)' })
  @ApiResponse({ status: 200, description: 'Cierre confirmado' })
  async confirmarCierre(
    @Body() dto: ConfirmarCierreDto,
  ) {
    return this.cajaService.cierre.confirmarCierre(dto.idCierre, dto.totalReal, dto.idUsuario);
  }

  @Get('cierre')
  @ApiOperation({ summary: 'Obtener cierre por fecha' })
  async findCierre(@Query('fecha') fecha: string) {
    return this.cajaService.cierre.findByFecha(new Date(fecha));
  }

  @Get('cierre/historial')
  @ApiOperation({ summary: 'Historial de cierres' })
  async findAllCierres() {
    return this.cajaService.cierre.findAll();
  }
}
