import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

const CONFIG_ID = 1;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Manda el recordatorio de turno por email con la anticipación configurada
   * en el negocio (`recordatorioHorasAntes`). Un turno solo entra una vez:
   * `recordatorioEnviadoEn` se marca al mandarlo, así que corridas repetidas
   * del cron no lo duplican aunque el turno siga dentro de la ventana.
   */
  @Cron('*/15 * * * *')
  async enviarRecordatorios(): Promise<void> {
    const config = await this.prisma.configuracionNegocio.findUnique({ where: { id: CONFIG_ID } });
    const horasAntes = config?.recordatorioHorasAntes ?? 24;

    const ahora = new Date();
    const limite = new Date(ahora.getTime() + horasAntes * 60 * 60 * 1000);

    const turnos = await this.prisma.turno.findMany({
      where: {
        estado: { notIn: ['CANCELADO', 'NO_SHOW', 'COMPLETADO'] },
        recordatorioEnviadoEn: null,
        fechaHoraInicio: { gte: ahora, lte: limite },
      },
      include: {
        persona: true,
        detalles: { include: { servicio: true } },
      },
    });

    for (const turno of turnos) {
      if (!turno.persona.mail) continue;

      try {
        const enviado = await this.mailService.sendTurnoRecordatorio(turno.persona.mail, {
          nombreCliente: turno.persona.nombre,
          fechaHoraInicio: turno.fechaHoraInicio,
          servicios: turno.detalles.map((d) => d.servicio.nombre),
          direccion: config?.direccion,
          whatsappUrl: config?.whatsappUrl,
        });

        if (!enviado) continue;

        await this.prisma.turno.update({
          where: { idTurno: turno.idTurno },
          data: { recordatorioEnviadoEn: new Date() },
        });
      } catch (err) {
        this.logger.error(`Fallo al mandar recordatorio del turno ${turno.idTurno}: ${err}`);
      }
    }
  }
}
