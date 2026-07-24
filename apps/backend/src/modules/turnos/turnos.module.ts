import { Module } from '@nestjs/common';
import { TurnosService } from './turnos.service';
import { TurnosController } from './turnos.controller';
import { TurnosPublicosController } from './turnos-publicos.controller';
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module';

@Module({
  imports: [GoogleCalendarModule],
  controllers: [TurnosController, TurnosPublicosController],
  providers: [TurnosService],
  exports: [TurnosService],
})
export class TurnosModule {}
