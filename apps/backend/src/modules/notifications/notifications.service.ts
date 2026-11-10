import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { urlCancelacion } from '../turnos/cancelacion-token.util';

const CONFIG_ID = 1;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Manda el recordatorio de turno por email con la anticipación configurada
   * en el negocio (`recordatorioHorasAntes`). Un turno solo entra una vez:
   * `recordatorioEnviadoEn` se marca al mandarlo, así que corridas repetidas
   * del cron no lo duplican aunque el turno siga dentro de la ventana.
   * Si el negocio apagó el recordatorio (`recordatorioActivo`), no manda nada.
   */
  @Cron('*/15 * * * *')
  async enviarRecordatorios(): Promise<void> {
    const config = await this.prisma.configuracionNegocio.findUnique({ where: { id: CONFIG_ID } });
    if (config && config.recordatorioActivo === false) return;
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

    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const secreto = this.configService.get<string>('JWT_SECRET');

    for (const turno of turnos) {
      if (!turno.persona.mail) continue;

      try {
        const enviado = await this.mailService.sendTurnoRecordatorio(turno.persona.mail, {
          nombreCliente: turno.persona.nombre,
          fechaHoraInicio: turno.fechaHoraInicio,
          servicios: turno.detalles.map((d) => d.servicio.nombre),
          direccion: config?.direccion,
          whatsappUrl: config?.whatsappUrl,
          nombreNegocio: config?.nombre,
          logoUrl: config?.logoUrl,
          colorPrimario: config?.colorPrimario,
          cancelarUrl: frontendUrl && secreto ? urlCancelacion(frontendUrl, turno.idTurno, secreto) : null,
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
