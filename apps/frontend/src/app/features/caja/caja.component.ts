import { Component, inject, signal, computed, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CajaService } from '../../shared/services/caja.service';
import { TurnosService } from '../../shared/services/turnos.service';
import { AuthService } from '../../shared/services/auth.service';
import { FormaPago, MovimientoCaja, TotalesCaja, CierreCaja, Pago } from '../../shared/models/caja.model';
import { Turno } from '../../shared/models/turno.model';
import { IconComponent } from '../../shared/ui/icon.component';
import { FechaArPipe } from '../../shared/pipes/fecha-ar.pipe';
import { PesosPipe } from '../../shared/pipes/pesos.pipe';
import { fechaLocal } from '../../shared/utils/fecha-local.util';

@Component({
  selector: 'app-caja',
  standalone: true,
  imports: [FormsModule, IconComponent, FechaArPipe, PesosPipe],
  template: `
    <div class="space-y-6 text-base-content">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-3xl font-medium tracking-tight">Caja</h1>
          <p class="text-base-content/60 mt-1">Pagos, movimientos y cierre de caja</p>
        </div>
        <div class="flex items-center gap-2">
          <input type="date" class="input input-bordered" [(ngModel)]="fecha" (change)="cargarDatos()" name="fecha" />
        </div>
      </div>

      <!-- Totales -->
      <div class="grid gap-4 sm:grid-cols-3">
        <div class="rounded-lg border-t-2 border-success bg-base-100 p-5 shadow-sm">
          <div class="flex items-center justify-between text-base-content/50">
            <span class="text-sm font-medium">Ingresos</span>
            <app-icon name="credit-card" [size]="18" />
          </div>
          <div class="font-display tabular-nums mt-2 text-3xl font-medium">{{ totales().ingresos | pesos }}</div>
        </div>
        <div class="rounded-lg border-t-2 border-error bg-base-100 p-5 shadow-sm">
          <div class="flex items-center justify-between text-base-content/50">
            <span class="text-sm font-medium">Egresos</span>
            <app-icon name="credit-card" [size]="18" />
          </div>
          <div class="font-display tabular-nums mt-2 text-3xl font-medium">{{ totales().egresos | pesos }}</div>
        </div>
        <div class="rounded-lg border-t-2 border-primary bg-base-100 p-5 shadow-sm">
          <div class="flex items-center justify-between text-base-content/50">
            <span class="text-sm font-medium">Balance</span>
            <app-icon name="calendar" [size]="18" />
          </div>
          <div class="font-display tabular-nums mt-2 text-3xl font-medium" [class.text-success]="totales().balance > 0" [class.text-error]="totales().balance < 0">{{ totales().balance | pesos }}</div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs tabs-boxed">
        <button class="tab" [class.tab-active]="tabActivo() === 'movimientos'" (click)="tabActivo.set('movimientos')">Movimientos</button>
        <button class="tab" [class.tab-active]="tabActivo() === 'pago'" (click)="tabActivo.set('pago')">Registrar Pago</button>
        <button class="tab" [class.tab-active]="tabActivo() === 'egreso'" (click)="tabActivo.set('egreso')">Registrar Egreso</button>
        <button class="tab" [class.tab-active]="tabActivo() === 'cierre'" (click)="tabActivo.set('cierre')">Cierre de Caja</button>
      </div>

      <!-- Movimientos -->
      @if (tabActivo() === 'movimientos') {
        <div class="card bg-base-100 shadow-sm">
          <div class="card-body">
            <h2 class="card-title text-lg mb-4">Movimientos del día</h2>
            <div class="overflow-x-auto">
              <table class="table">
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Tipo</th>
                    <th>Concepto</th>
                    <th>Forma de Pago</th>
                    <th class="text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  @for (mov of movimientos(); track mov.idMovimiento) {
                    <tr class="hover:bg-base-200/50">
                      <td>{{ mov.fechaHora | fechaAr:'hora' }}</td>
                      <td>
                        <span class="badge" [class.badge-success]="mov.tipo === 'INGRESO'" [class.badge-error]="mov.tipo === 'EGRESO'">{{ mov.tipo }}</span>
                      </td>
                      <td>{{ mov.concepto }}</td>
                      <td>{{ mov.formaPago?.nombre }}</td>
                      <td class="tabular-nums text-right font-medium" [class.text-success]="mov.tipo === 'INGRESO'" [class.text-error]="mov.tipo === 'EGRESO'">
                        {{ mov.tipo === 'INGRESO' ? '+' : '-' }}{{ mov.monto | pesos }}
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="5" class="text-center py-8 text-base-content/60">
                        <div class="flex flex-col items-center gap-2">
                          <app-icon name="calendar" [size]="32" />
                          <span>No hay movimientos para esta fecha</span>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }

      <!-- Pago -->
      @if (tabActivo() === 'pago') {
        <div class="card bg-base-100 shadow-sm">
          <div class="card-body">
            <h2 class="card-title text-lg mb-4">Registrar pago de turno</h2>
            <form (ngSubmit)="procesarPago()" class="space-y-4 max-w-2xl">
              <div class="form-control">
                <label class="label"><span class="label-text">Turno</span></label>
                <select class="select select-bordered w-full" [(ngModel)]="pagoTurnoId" name="pagoTurnoId" (change)="actualizarTotalTurno()" required>
                  <option [value]="null">Seleccionar turno</option>
                  @for (turno of turnosPagables(); track turno.idTurno) {
                    <option [value]="turno.idTurno">
                      #{{ turno.idTurno }} - {{ turno.persona?.nombre }} {{ turno.persona?.apellido }} - {{ turno.fechaHoraInicio | fechaAr:'cortaHora' }} (Total: {{ totalTurno(turno) | pesos }})
                    </option>
                  }
                </select>
                @if (turnosPagables().length === 0) {
                  <p class="text-sm text-base-content/60 mt-2">No hay turnos finalizados pendientes de pago.</p>
                }
              </div>

              <div class="grid gap-4 md:grid-cols-2">
                <div class="form-control">
                  <label class="label"><span class="label-text">Forma de pago</span></label>
                  <select class="select select-bordered w-full" [(ngModel)]="pagoFormaPagoId" name="pagoFormaPagoId" required>
                    <option [value]="null">Seleccionar</option>
                    @for (fp of formasPago(); track fp.idFormaPago) {
                      <option [value]="fp.idFormaPago">{{ fp.nombre }}</option>
                    }
                  </select>
                </div>
                <div class="form-control">
                  <label class="label"><span class="label-text">Monto</span></label>
                  <input type="number" class="input input-bordered w-full" [(ngModel)]="pagoMonto" name="pagoMonto" placeholder="0.00" required />
                </div>
              </div>

              @if (formaPagoSeleccionada()?.requiereComprobante) {
                <div class="form-control">
                  <label class="label"><span class="label-text">Comprobante</span></label>
                  <input type="text" class="input input-bordered w-full" [(ngModel)]="pagoComprobante" name="pagoComprobante" placeholder="Número de comprobante" />
                </div>
              }

              @if (pagosTurno().length > 0) {
                <div class="alert alert-info">
                  <app-icon name="credit-card" [size]="18" />
                  <span>Este turno ya tiene {{ pagosTurno().length }} pago(s) por total {{ totalPagado() | pesos }}.</span>
                </div>
              }

              <button type="submit" class="btn btn-primary" [class.btn-loading]="guardando()" [disabled]="!pagoTurnoId() || !pagoFormaPagoId() || !pagoMonto() || guardando()">
                Registrar Pago
              </button>

              @if (mensaje()) {
                <div class="alert" [class.alert-success]="exito()" [class.alert-error]="!exito()">
                  <app-icon [name]="exito() ? 'check-circle' : 'alert-circle'" [size]="18" />
                  <span>{{ mensaje() }}</span>
                </div>
              }
            </form>
          </div>
        </div>
      }

      <!-- Egreso -->
      @if (tabActivo() === 'egreso') {
        <div class="card bg-base-100 shadow-sm">
          <div class="card-body">
            <h2 class="card-title text-lg mb-4">Registrar egreso</h2>
            <form (ngSubmit)="procesarEgreso()" class="space-y-4 max-w-2xl">
              <div class="form-control">
                <label class="label"><span class="label-text">Concepto</span></label>
                <input type="text" class="input input-bordered w-full" [(ngModel)]="egresoConcepto" name="egresoConcepto" placeholder="Ej: Compra de insumos" required />
              </div>
              <div class="grid gap-4 md:grid-cols-2">
                <div class="form-control">
                  <label class="label"><span class="label-text">Forma de pago</span></label>
                  <select class="select select-bordered w-full" [(ngModel)]="egresoFormaPagoId" name="egresoFormaPagoId" required>
                    <option [value]="null">Seleccionar</option>
                    @for (fp of formasPago(); track fp.idFormaPago) {
                      <option [value]="fp.idFormaPago">{{ fp.nombre }}</option>
                    }
                  </select>
                </div>
                <div class="form-control">
                  <label class="label"><span class="label-text">Monto</span></label>
                  <input type="number" class="input input-bordered w-full" [(ngModel)]="egresoMonto" name="egresoMonto" placeholder="0.00" required />
                </div>
              </div>
              <button type="submit" class="btn btn-error" [class.btn-loading]="guardando()" [disabled]="!egresoConcepto() || !egresoFormaPagoId() || !egresoMonto() || guardando()">
                Registrar Egreso
              </button>
              @if (mensaje()) {
                <div class="alert" [class.alert-success]="exito()" [class.alert-error]="!exito()">
                  <app-icon [name]="exito() ? 'check-circle' : 'alert-circle'" [size]="18" />
                  <span>{{ mensaje() }}</span>
                </div>
              }
            </form>
          </div>
        </div>
      }

      <!-- Cierre -->
      @if (tabActivo() === 'cierre') {
        <div class="space-y-6">
          <!-- Estado actual -->
          <div class="card bg-base-100 shadow-sm">
            <div class="card-body">
              <h2 class="card-title text-lg mb-4">Cierre de caja</h2>
              @if (cierreActual(); as cierre) {
                <div class="grid gap-4 md:grid-cols-2">
                  <div class="space-y-3">
                    <div class="flex justify-between py-2 border-b">
                      <span class="text-base-content/60">Efectivo</span>
                      <span class="tabular-nums font-medium">{{ cierre.totalEfectivo | pesos }}</span>
                    </div>
                    <div class="flex justify-between py-2 border-b">
                      <span class="text-base-content/60">Tarjeta</span>
                      <span class="tabular-nums font-medium">{{ cierre.totalTarjeta | pesos }}</span>
                    </div>
                    <div class="flex justify-between py-2 border-b">
                      <span class="text-base-content/60">Transferencia</span>
                      <span class="tabular-nums font-medium">{{ cierre.totalTransferencia | pesos }}</span>
                    </div>
                    <div class="flex justify-between py-2 border-b">
                      <span class="text-base-content/60">Otros</span>
                      <span class="tabular-nums font-medium">{{ cierre.totalOtros | pesos }}</span>
                    </div>
                    <div class="flex justify-between py-2 border-b">
                      <span class="font-semibold">Total Esperado</span>
                      <span class="tabular-nums font-semibold">{{ cierre.totalEsperado | pesos }}</span>
                    </div>
                  </div>
                  <div class="space-y-4">
                    @if (cierre.horaFin) {
                      <div class="alert alert-success">
                        <app-icon name="check-circle" [size]="18" />
                        <span>Cierre confirmado el {{ cierre.horaFin | fechaAr:'cortaHora' }} con diferencia de {{ cierre.diferencia | pesos }}</span>
                      </div>
                    } @else {
                      <div class="form-control">
                        <label class="label"><span class="label-text">Total Real Contado</span></label>
                        <input type="number" class="input input-bordered w-full" [(ngModel)]="cierreTotalReal" name="cierreTotalReal" placeholder="0.00" />
                      </div>
                      <button class="btn btn-primary w-full" [class.btn-loading]="guardando()" [disabled]="!cierreTotalReal() || guardando()" (click)="confirmarCierre()">
                        Confirmar Cierre
                      </button>
                    }
                  </div>
                </div>
              } @else {
                <div class="space-y-4">
                  <p class="text-base-content/60">No hay cierre iniciado para esta fecha.</p>
                  <button class="btn btn-primary gap-2" [class.btn-loading]="guardando()" [disabled]="guardando()" (click)="iniciarCierre()">
                    <app-icon name="calendar" [size]="18" />
                    Iniciar Cierre
                  </button>
                </div>
              }
              @if (mensaje()) {
                <div class="alert mt-4" [class.alert-success]="exito()" [class.alert-error]="!exito()">
                  <app-icon [name]="exito() ? 'check-circle' : 'alert-circle'" [size]="18" />
                  <span>{{ mensaje() }}</span>
                </div>
              }
            </div>
          </div>

          <!-- Historial -->
          <div class="card bg-base-100 shadow-sm">
            <div class="card-body">
              <h2 class="card-title text-lg mb-4">Historial de cierres</h2>
              <div class="overflow-x-auto">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Hora Inicio</th>
                      <th>Hora Fin</th>
                      <th>Esperado</th>
                      <th>Real</th>
                      <th>Diferencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (c of historialCierres(); track c.idCierre) {
                      <tr class="hover:bg-base-200/50">
                        <td>{{ c.fecha | fechaAr:'media':true }}</td>
                        <td>{{ c.horaInicio | fechaAr:'hora' }}</td>
                        <td>
                          @if (c.horaFin) {
                            {{ c.horaFin | fechaAr:'hora' }}
                          } @else {
                            <span class="badge badge-warning badge-sm">Pendiente</span>
                          }
                        </td>
                        <td class="tabular-nums font-medium">{{ c.totalEsperado | pesos }}</td>
                        <td class="tabular-nums font-medium">{{ c.horaFin ? (c.totalReal | pesos) : '—' }}</td>
                        <td class="tabular-nums font-medium" [class.text-success]="c.diferencia >= 0" [class.text-error]="c.diferencia < 0">
                          {{ c.horaFin ? (c.diferencia | pesos) : '—' }}
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="6" class="text-center py-8 text-base-content/60">
                          <div class="flex flex-col items-center gap-2">
                            <app-icon name="calendar" [size]="32" />
                            <span>No hay cierres registrados</span>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class CajaComponent implements OnInit, OnDestroy {
  private readonly cajaService = inject(CajaService);
  private readonly turnosService = inject(TurnosService);
  private readonly authService = inject(AuthService);
  private mensajeTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // Fecha
  fecha = signal(fechaLocal());

  // Tabs
  tabActivo = signal<'movimientos' | 'pago' | 'egreso' | 'cierre'>('movimientos');

  // Datos
  formasPago = signal<FormaPago[]>([]);
  movimientos = signal<MovimientoCaja[]>([]);
  totales = signal<TotalesCaja>({ fecha: this.fecha(), ingresos: 0, egresos: 0, balance: 0 });
  cierreActual = signal<CierreCaja | null>(null);
  historialCierres = signal<CierreCaja[]>([]);
  turnos = signal<Turno[]>([]);
  pagosTurno = signal<Pago[]>([]);

  // Estado
  guardando = signal(false);
  mensaje = signal('');
  exito = signal(false);

  // Form Pago
  pagoTurnoId = signal<number | null>(null);
  pagoFormaPagoId = signal<number | null>(null);
  pagoMonto = signal<number | null>(null);
  pagoComprobante = signal('');

  // Form Egreso
  egresoConcepto = signal('');
  egresoFormaPagoId = signal<number | null>(null);
  egresoMonto = signal<number | null>(null);

  // Cierre
  cierreTotalReal = signal<number | null>(null);

  turnosPagables = computed(() =>
    this.turnos().filter((t) => t.estado === 'COMPLETADO')
  );

  formaPagoSeleccionada = computed(() =>
    this.formasPago().find((fp) => fp.idFormaPago === this.pagoFormaPagoId())
  );

  totalPagado = computed(() =>
    this.pagosTurno().reduce((total, p) => total + Number(p.monto), 0)
  );

  ngOnInit(): void {
    this.cargarDatos();
  }

  ngOnDestroy(): void {
    if (this.mensajeTimeoutId) {
      clearTimeout(this.mensajeTimeoutId);
    }
  }

  private mostrarMensaje(texto: string, ok: boolean): void {
    if (this.mensajeTimeoutId) {
      clearTimeout(this.mensajeTimeoutId);
    }
    this.exito.set(ok);
    this.mensaje.set(texto);
    this.mensajeTimeoutId = setTimeout(() => {
      this.mensaje.set('');
      this.mensajeTimeoutId = null;
    }, 5000);
  }

  cargarDatos(): void {
    const f = this.fecha();
    this.cajaService.findFormasPago().subscribe((fp) => this.formasPago.set(fp));
    this.cajaService.findMovimientos(f).subscribe((m) => this.movimientos.set(m));
    this.cajaService.findTotales(f).subscribe((t) => this.totales.set(t));
    this.cajaService.findCierre(f).subscribe({
      next: (c) => this.cierreActual.set(c),
      error: () => this.cierreActual.set(null),
    });
    this.cajaService.findHistorialCierres().subscribe((h) => this.historialCierres.set(h));
    this.turnosService.findAll(undefined, undefined, 1, 200).subscribe((res) => this.turnos.set(res.data));
  }

  totalTurno(turno: Turno): number {
    return (turno.detalles || []).reduce((total, d) => total + Number(d.precioReal) * d.cantidad, 0);
  }

  actualizarTotalTurno(): void {
    const id = this.pagoTurnoId();
    if (!id) {
      this.pagosTurno.set([]);
      this.pagoMonto.set(null);
      return;
    }
    const turno = this.turnos().find((t) => t.idTurno === id);
    if (turno) {
      const total = this.totalTurno(turno);
      this.pagoMonto.set(total);
      this.cajaService.findPagosByTurno(id).subscribe((p) => this.pagosTurno.set(p));
    }
  }

  procesarPago(): void {
    const idTurno = this.pagoTurnoId();
    const idFormaPago = this.pagoFormaPagoId();
    const monto = this.pagoMonto();
    if (!idTurno || !idFormaPago || !monto) return;

    this.guardando.set(true);
    this.mensaje.set('');

    this.cajaService.procesarPago({
      idTurno,
      idFormaPago,
      monto,
      comprobante: this.pagoComprobante() || undefined,
    }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.mostrarMensaje('Pago registrado correctamente', true);
        this.pagoTurnoId.set(null);
        this.pagoFormaPagoId.set(null);
        this.pagoMonto.set(null);
        this.pagoComprobante.set('');
        this.pagosTurno.set([]);
        this.cargarDatos();
      },
      error: (err) => {
        this.guardando.set(false);
        this.mostrarMensaje(err?.error?.message || 'Error al registrar el pago', false);
      },
    });
  }

  procesarEgreso(): void {
    const concepto = this.egresoConcepto();
    const idFormaPago = this.egresoFormaPagoId();
    const monto = this.egresoMonto();
    if (!concepto || !idFormaPago || !monto) return;

    this.guardando.set(true);
    this.mensaje.set('');

    this.cajaService.createMovimiento({
      tipo: 'EGRESO',
      monto,
      concepto,
      idFormaPago,
    }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.mostrarMensaje('Egreso registrado correctamente', true);
        this.egresoConcepto.set('');
        this.egresoFormaPagoId.set(null);
        this.egresoMonto.set(null);
        this.cargarDatos();
      },
      error: (err) => {
        this.guardando.set(false);
        this.mostrarMensaje(err?.error?.message || 'Error al registrar el egreso', false);
      },
    });
  }

  iniciarCierre(): void {
    this.guardando.set(true);
    this.mensaje.set('');
    this.cajaService.iniciarCierre(this.fecha()).subscribe({
      next: (cierre) => {
        this.guardando.set(false);
        this.mostrarMensaje('Cierre iniciado correctamente', true);
        this.cierreActual.set(cierre);
        this.cargarDatos();
      },
      error: (err) => {
        this.guardando.set(false);
        this.mostrarMensaje(err?.error?.message || 'Error al iniciar el cierre', false);
      },
    });
  }

  confirmarCierre(): void {
    const cierre = this.cierreActual();
    const totalReal = this.cierreTotalReal();
    const usuario = this.authService.currentUser()?.usuario;
    if (!cierre || !totalReal || !usuario) return;

    this.guardando.set(true);
    this.mensaje.set('');
    this.cajaService.confirmarCierre({
      idCierre: cierre.idCierre,
      totalReal,
      idUsuario: usuario,
    }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.mostrarMensaje('Cierre confirmado correctamente', true);
        this.cierreTotalReal.set(null);
        this.cargarDatos();
      },
      error: (err) => {
        this.guardando.set(false);
        this.mostrarMensaje(err?.error?.message || 'Error al confirmar el cierre', false);
      },
    });
  }
}
