import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './modules/prisma/prisma.module';
import { ServiciosModule } from './modules/servicios/servicios.module';
import { TurnosModule } from './modules/turnos/turnos.module';
import { PersonasModule } from './modules/personas/personas.module';
import { CajaModule } from './modules/caja/caja.module';
import { AuthModule } from './modules/auth/auth.module';
import { GoogleCalendarModule } from './modules/google-calendar/google-calendar.module';
import { ReportesModule } from './modules/reportes/reportes.module';
import { ConfiguracionModule } from './modules/configuracion/configuracion.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    ServiciosModule,
    TurnosModule,
    PersonasModule,
    CajaModule,
    GoogleCalendarModule,
    ReportesModule,
    ConfiguracionModule,
  ],
})
export class AppModule {}
