import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PagosService } from './pagos.service';
import { MovimientosService } from './movimientos.service';
import { TurnosService } from '../turnos/turnos.service';
import { CreatePagoDto } from './dto/create-pago.dto';
import { MovimientoTipo } from '../../common/enums/movimiento-tipo.enum';
import { Pago } from '@prisma/client';

/**
 * Facade: Coordina el proceso completo de pago.
 * Por dentro maneja: registrar Pago, crear MovimientoCaja, actualizar Turno.
 * El resto del sistema no necesita saber cómo funciona la caja por dentro.
 */
@Injectable()
export class CajaFacade {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pagosService: PagosService,
    private readonly movimientosService: MovimientosService,
    private readonly turnosService: TurnosService,
  ) {}

  /**
   * Procesa un pago completo:
   * 1. Valida que el turno exista y esté COMPLETADO
   * 2. Registra el pago
   * 3. Crea un movimiento de caja (INGRESO)
   * 4. Verifica que el turno esté completamente pagado
   */
  async procesarPago(
    dto: CreatePagoDto,
    idUsuario: string,
  ): Promise<{ pago: Pago; movimiento: any; turnoActualizado: boolean }> {
    // 1. Validar turno
    const turno = await this.turnosService.findOne(dto.idTurno);
    if (!turno) {
      throw new NotFoundException(`Turno ${dto.idTurno} no encontrado`);
    }

    // Solo se puede pagar si está COMPLETADO
    if (turno.estado !== 'COMPLETADO') {
      throw new BadRequestException(
        `No se puede pagar: el turno está ${turno.estado}`,
      );
    }

    // 2 y 3. Registrar pago y crear movimiento de caja en una sola transacción:
    // si el movimiento fallara después de guardar el pago, quedaría plata
    // cobrada que nunca aparece en los totales de caja.
    const formaPago = await this.prisma.formaPago.findUnique({
      where: { idFormaPago: dto.idFormaPago },
    });

    const [pago, movimiento] = await this.prisma.$transaction(async (tx) => {
      const pagoCreado = await this.pagosService.create(dto, tx);
      const movimientoCreado = await this.movimientosService.create(
        {
          tipo: MovimientoTipo.INGRESO,
          monto: dto.monto,
          concepto: `Pago turno #${dto.idTurno} - ${formaPago?.nombre || 'N/A'}`,
          idFormaPago: dto.idFormaPago,
          idUsuario,
          idTurno: dto.idTurno,
        },
        tx,
      );
      return [pagoCreado, movimientoCreado];
    });

    // 4. Verificar si el turno está completamente pagado
    const totalPagado = await this.pagosService.calcularTotalPagado(dto.idTurno);
    const totalTurno = await this.turnosService.calcularTotal(dto.idTurno);

    const turnoActualizado = totalPagado >= totalTurno;

    return { pago, movimiento, turnoActualizado };
  }

  /**
   * Registra un egreso de caja (retiro, compra de insumos, etc.)
   */
  async registrarEgreso(
    monto: number,
    concepto: string,
    idFormaPago: number,
    idUsuario: string,
  ) {
    return this.movimientosService.create({
      tipo: MovimientoTipo.EGRESO,
      monto,
      concepto,
      idFormaPago,
      idUsuario,
    });
  }
}
