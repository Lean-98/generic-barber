import { Module } from '@nestjs/common';
import { TurnosService } from './turnos.service';
import { TurnosController } from './turnos.controller';
import { TurnosPublicosController } from './turnos-publicos.controller';
import { TurnosCronService } from './turnos-cron.service';
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [GoogleCalendarModule, MailModule],
  controllers: [TurnosController, TurnosPublicosController],
  providers: [TurnosService, TurnosCronService],
  exports: [TurnosService],
})
export class TurnosModule {}
