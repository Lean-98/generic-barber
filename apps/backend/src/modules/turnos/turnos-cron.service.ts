import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { TurnosService } from './turnos.service';

/**
 * Avanza los turnos solos, por el reloj, para que el dueño (que también
 * atiende) no tenga que ir tocando la pantalla entre cliente y cliente.
 * Siempre llama a los métodos del servicio (nunca escribe `estado` directo),
 * así se reutiliza la validación del patrón State y el cron no puede
 * transicionar un turno a un estado ilegal. Cancelar y marcar no-show siguen
 * siendo siempre manuales — son las excepciones.
 */
@Injectable()
export class TurnosCronService {
  private readonly logger = new Logger(TurnosCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly turnosService: TurnosService,
  ) {}

  @Cron('*/5 * * * *')
  async procesarTransicionesAutomaticas(): Promise<void> {
    await this.confirmarPendientesRezagados();
    await this.iniciarTurnosQueArrancan();
    await this.finalizarTurnosQueTerminan();
  }

  /**
   * Limpieza de turnos que hayan quedado en PENDIENTE de antes de que los
   * turnos nuevos empezaran a nacer directo CONFIRMADO. No debería encontrar
   * nada después de la primera corrida tras el despliegue de este cambio.
   */
  private async confirmarPendientesRezagados(): Promise<void> {
    const pendientes = await this.prisma.turno.findMany({ where: { estado: 'PENDIENTE' } });
    for (const turno of pendientes) {
      try {
        await this.turnosService.confirmar(turno.idTurno);
      } catch (err) {
        this.logger.error(`Fallo al confirmar automáticamente el turno ${turno.idTurno}: ${err}`);
      }
    }
  }

  private async iniciarTurnosQueArrancan(): Promise<void> {
    const ahora = new Date();
    const turnos = await this.prisma.turno.findMany({
      where: { estado: 'CONFIRMADO', fechaHoraInicio: { lte: ahora } },
    });
    for (const turno of turnos) {
      try {
        await this.turnosService.iniciarAtencion(turno.idTurno);
      } catch (err) {
        this.logger.error(`Fallo al iniciar automáticamente el turno ${turno.idTurno}: ${err}`);
      }
    }
  }

  private async finalizarTurnosQueTerminan(): Promise<void> {
    const ahora = new Date();
    const turnos = await this.prisma.turno.findMany({
      where: { estado: 'EN_PROCESO', fechaHoraFin: { lte: ahora } },
    });
    for (const turno of turnos) {
      try {
        await this.turnosService.finalizar(turno.idTurno);
      } catch (err) {
        this.logger.error(`Fallo al finalizar automáticamente el turno ${turno.idTurno}: ${err}`);
      }
    }
  }
}
