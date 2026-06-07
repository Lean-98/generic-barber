import { Module } from '@nestjs/common';
import { CajaService } from './caja.service';
import { CajaController } from './caja.controller';
import { PagosService } from './pagos.service';
import { MovimientosService } from './movimientos.service';
import { CierreService } from './cierre.service';
import { CajaFacade } from './caja.facade';
import { TurnosModule } from '../turnos/turnos.module';

@Module({
  imports: [TurnosModule],
  controllers: [CajaController],
  providers: [CajaService, PagosService, MovimientosService, CierreService, CajaFacade],
  exports: [CajaService, PagosService, MovimientosService, CierreService, CajaFacade],
})
export class CajaModule {}
