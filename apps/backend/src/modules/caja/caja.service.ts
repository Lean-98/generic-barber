import { Injectable } from '@nestjs/common';
import { PagosService } from './pagos.service';
import { MovimientosService } from './movimientos.service';
import { CierreService } from './cierre.service';
import { CajaFacade } from './caja.facade';

@Injectable()
export class CajaService {
  constructor(
    public readonly pagos: PagosService,
    public readonly movimientos: MovimientosService,
    public readonly cierre: CierreService,
    public readonly facade: CajaFacade,
  ) {}
}
