import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
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
    ThrottlerModule.forRoot([
      {
        // Límite general: generoso para no molestar el uso normal del panel.
        name: 'default',
        ttl: 60_000,
        limit: 120,
        // Los tests e2e loguean un usuario nuevo por test y comparten la
        // misma IP/proceso: sin esto, el límite de @Throttle en rutas como
        // login se agota entre tests sin que eso sea lo que se está probando.
        skipIf: () => process.env.NODE_ENV === 'test',
      },
    ]),
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
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
