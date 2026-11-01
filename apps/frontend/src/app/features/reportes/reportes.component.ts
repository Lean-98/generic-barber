import { Component, ElementRef, ViewChild, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReportesService } from '../../shared/services/reportes.service';
import {
  ClienteInactivo,
  ClienteReporte,
  CostosNegocio,
  IngresosPorDia,
  ReporteRentabilidad,
  IngresosPorFormaPago,
  ReporteResumen,
  ServicioReporte,
  TurnosPorEstado,
} from '../../shared/models/reportes.model';
import { IconComponent } from '../../shared/ui/icon.component';
import { FechaArPipe } from '../../shared/pipes/fecha-ar.pipe';
import { PesosPipe } from '../../shared/pipes/pesos.pipe';
import { fechaLocal } from '../../shared/utils/fecha-local.util';
import { whatsappDeTelefono } from '../../shared/utils/whatsapp.util';
import { mensajeDeErrorHttp } from '../../shared/utils/error-http.util';
import { BrandingService } from '../../core/services/branding.service';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [FormsModule, IconComponent, FechaArPipe, PesosPipe],
  template: `
    <div class="space-y-6 text-base-content">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 class="text-3xl font-medium tracking-tight">Reportes</h1>
          <p class="text-base-content/60 mt-1">Estadísticas e ingresos de tu peluquería</p>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div class="join">
            <input type="date" class="input input-bordered join-item" [(ngModel)]="desde" name="desde" (change)="cargar()" />
            <span class="join-item bg-base-200 px-3 py-2 text-sm text-base-content/70 flex items-center">a</span>
            <input type="date" class="input input-bordered join-item" [(ngModel)]="hasta" name="hasta" (change)="cargar()" />
          </div>
          <div class="join">
            <button class="btn join-item btn-sm" (click)="setHoy()">Hoy</button>
            <button class="btn join-item btn-sm" (click)="setUltimos7()">7 días</button>
            <button class="btn join-item btn-sm" (click)="setEsteMes()">Este mes</button>
          </div>
        </div>
      </div>

      <!-- Resumen -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-lg bg-base-100 p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-base-content/60">Ingresos</span>
            <span class="flex h-9 w-9 items-center justify-center rounded-full bg-success/10 text-success">
              <app-icon name="trending-up" [size]="16" />
            </span>
          </div>
          <div class="font-display tabular-nums mt-3 text-2xl font-medium text-success">{{ resumen().totalIngresos | pesos }}</div>
        </div>
        <div class="rounded-lg bg-base-100 p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-base-content/60">Egresos</span>
            <span class="flex h-9 w-9 items-center justify-center rounded-full bg-error/10 text-error">
              <app-icon name="trending-down" [size]="16" />
            </span>
          </div>
          <div class="font-display tabular-nums mt-3 text-2xl font-medium text-error">{{ resumen().totalEgresos | pesos }}</div>
        </div>
        <div class="rounded-lg bg-base-100 p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-base-content/60">Balance</span>
            <span class="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <app-icon name="wallet" [size]="16" />
            </span>
          </div>
          <div class="font-display tabular-nums mt-3 text-2xl font-medium" [class.text-success]="resumen().balance >= 0" [class.text-error]="resumen().balance < 0">
            {{ resumen().balance | pesos }}
          </div>
        </div>
        <div class="rounded-lg bg-base-100 p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-base-content/60">Turnos</span>
            <span class="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent">
              <app-icon name="calendar" [size]="16" />
            </span>
          </div>
          <div class="font-display tabular-nums mt-3 text-2xl font-medium">{{ resumen().totalTurnos }}</div>
          <div class="mt-1 text-xs text-base-content/60">{{ resumen().turnosPagados }} pagados · {{ resumen().turnosCancelados }} cancelados</div>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-2">
        <!-- Ingresos por día -->
        <div class="card bg-base-100 shadow-sm">
          <div class="card-body">
            <h2 class="card-title text-lg">Ingresos por día</h2>
            @if (ingresosPorDia().length === 0) {
              <div class="py-8 text-center text-base-content/60">Sin datos en este período</div>
            } @else {
              <div class="mt-4 space-y-3">
                @let maxIngresos = maxIngresosPorDia();
                @for (item of ingresosPorDia(); track item.fecha) {
                  <div>
                    <div class="flex justify-between text-sm mb-1">
                      <span class="font-medium text-base-content">{{ item.fecha | fechaAr:'diaSemana' }}</span>
                      <span class="tabular-nums text-success">{{ item.ingresos | pesos }}</span>
                    </div>
                    <div class="h-2 w-full rounded-full bg-base-200">
                      <div class="h-2 rounded-full bg-success" [style.width.%]="maxIngresos > 0 ? (item.ingresos / maxIngresos) * 100 : 0"></div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <!-- Turnos por estado -->
        <div class="card bg-base-100 shadow-sm">
          <div class="card-body">
            <h2 class="card-title text-lg">Turnos por estado</h2>
            @if (turnosPorEstado().length === 0) {
              <div class="py-8 text-center text-base-content/60">Sin datos en este período</div>
            } @else {
              <div class="mt-4 space-y-3">
                @let maxTurnos = maxTurnosPorEstado();
                @for (item of turnosPorEstado(); track item.estado) {
                  <div>
                    <div class="flex justify-between text-sm mb-1">
                      <span class="font-medium text-base-content">{{ estadoLabel(item.estado) }}</span>
                      <span class="text-base-content">{{ item.cantidad }}</span>
                    </div>
                    <div class="h-2 w-full rounded-full bg-base-200">
                      <div class="h-2 rounded-full" [class.bg-primary]="item.estado === 'CONFIRMADO' || item.estado === 'COMPLETADO'" [class.bg-warning]="item.estado === 'PENDIENTE' || item.estado === 'EN_PROCESO'" [class.bg-error]="item.estado === 'CANCELADO' || item.estado === 'NO_SHOW'" [style.width.%]="maxTurnos > 0 ? (item.cantidad / maxTurnos) * 100 : 0"></div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-2">
        <!-- Formas de pago -->
        <div class="card bg-base-100 shadow-sm">
          <div class="card-body">
            <h2 class="card-title text-lg">Ingresos por forma de pago</h2>
            @if (formasPago().length === 0) {
              <div class="py-8 text-center text-base-content/60">Sin datos en este período</div>
            } @else {
              <div class="mt-4 space-y-3">
                @let maxPago = maxFormasPago();
                @for (item of formasPago(); track item.idFormaPago) {
                  <div>
                    <div class="flex justify-between text-sm mb-1">
                      <span class="font-medium text-base-content">{{ item.nombre }}</span>
                      <span class="tabular-nums text-base-content">{{ item.monto | pesos }}</span>
                    </div>
                    <div class="h-2 w-full rounded-full bg-base-200">
                      <div class="h-2 rounded-full bg-info" [style.width.%]="maxPago > 0 ? (item.monto / maxPago) * 100 : 0"></div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <!-- Top servicios -->
        <div class="card bg-base-100 shadow-sm">
          <div class="card-body">
            <h2 class="card-title text-lg">Servicios más solicitados</h2>
            @if (servicios().length === 0) {
              <div class="py-8 text-center text-base-content/60">Sin datos en este período</div>
            } @else {
              <div class="overflow-x-auto">
                <table class="table table-sm">
                  <thead>
                    <tr>
                      <th>Servicio</th>
                      <th class="text-right">Cantidad</th>
                      <th class="text-right">Ingresos</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of servicios(); track item.idServicio) {
                      <tr class="hover:bg-base-200/50">
                        <td>{{ item.nombre }}</td>
                        <td class="text-right">{{ item.cantidad }}</td>
                        <td class="tabular-nums text-right text-success">{{ item.ingresos | pesos }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Top clientes -->
      <div class="card bg-base-100 shadow-sm">
        <div class="card-body">
          <h2 class="card-title text-lg">Top clientes</h2>
          @if (clientes().length === 0) {
            <div class="py-8 text-center text-base-content/60">Sin datos en este período</div>
          } @else {
            <div class="overflow-x-auto">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th class="text-right">Turnos</th>
                    <th class="text-right">Ingresos</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of clientes(); track item.idPersona) {
                    <tr class="hover:bg-base-200/50">
                      <td>{{ item.nombre }} {{ item.apellido }}</td>
                      <td class="text-right">{{ item.cantidadTurnos }}</td>
                      <td class="tabular-nums text-right text-success">{{ item.ingresos | pesos }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      </div>
      <!-- Rentabilidad -->
      <div class="card bg-base-100 shadow-sm">
        <div class="card-body">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 class="card-title text-lg">Rentabilidad</h2>
              <p class="text-sm text-base-content/60">Turnos completados del período, con los costos que cargaste.</p>
            </div>
            <button class="btn btn-ghost btn-sm gap-2" (click)="abrirCostos()">
              <app-icon name="settings" [size]="16" />
              Costos
            </button>
          </div>

          @if (rentabilidad(); as r) {
            @if (!r.costosConfigurados) {
              <div class="alert mt-4 text-sm">
                <app-icon name="alert-circle" [size]="18" />
                <span>
                  Para ver el margen y el punto de equilibrio, cargá tus gastos fijos del mes y el costo por hora en
                  <button class="link link-primary" (click)="abrirCostos()">Costos</button>, y el costo de insumos de cada servicio en Servicios.
                </span>
              </div>
            } @else {
              <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div>
                  <div class="text-xs uppercase tracking-wide text-base-content/60">Cobrado en servicios</div>
                  <div class="font-display tabular-nums text-xl font-medium">{{ r.ingresosServicios | pesos }}</div>
                  <div class="text-xs text-base-content/60">{{ r.turnosCompletados }} turnos completados</div>
                </div>
                <div>
                  <div class="text-xs uppercase tracking-wide text-base-content/60">Costos variables</div>
                  <div class="font-display tabular-nums text-xl font-medium text-error">− {{ r.costosVariables | pesos }}</div>
                  <div class="text-xs text-base-content/60">Insumos + horas de trabajo</div>
                </div>
                <div>
                  <div class="text-xs uppercase tracking-wide text-base-content/60">Margen</div>
                  <div class="font-display tabular-nums text-xl font-medium">{{ r.margenContribucion | pesos }}</div>
                  @if (r.margenPromedioPorTurno !== null) {
                    <div class="text-xs text-base-content/60">{{ r.margenPromedioPorTurno | pesos }} por turno</div>
                  }
                </div>
                <div>
                  <div class="text-xs uppercase tracking-wide text-base-content/60">Costos fijos</div>
                  <div class="font-display tabular-nums text-xl font-medium text-error">− {{ r.costosFijosPeriodo | pesos }}</div>
                  <div class="text-xs text-base-content/60">Proporcional a {{ r.dias }} {{ r.dias === 1 ? 'día' : 'días' }}</div>
                </div>
                <div>
                  <div class="text-xs uppercase tracking-wide text-base-content/60">Resultado</div>
                  <div class="font-display tabular-nums text-xl font-medium" [class.text-success]="r.resultado >= 0" [class.text-error]="r.resultado < 0">
                    {{ r.resultado | pesos }}
                  </div>
                  <div class="text-xs text-base-content/60">{{ r.resultado >= 0 ? 'Ganancia' : 'Pérdida' }} del período</div>
                </div>
              </div>

              <div class="mt-5 grid gap-4 md:grid-cols-2">
                <div class="rounded-lg border border-base-300 p-4">
                  <div class="flex items-center gap-2 font-medium">
                    <app-icon name="bar-chart" [size]="16" />
                    Punto de equilibrio
                  </div>
                  @if (r.aviso) {
                    <p class="mt-2 text-sm text-base-content/70">{{ r.aviso }}</p>
                  } @else {
                    <p class="mt-2 text-sm">
                      Necesitás <strong>{{ r.turnosParaCubrirFijosMes }} turnos por mes</strong> para cubrir los gastos fijos.
                    </p>
                    <p class="mt-1 text-sm text-base-content/70">
                      En este período: {{ r.turnosCompletados }} de {{ r.turnosParaCubrirFijosPeriodo }}
                      @if (r.turnosFaltantesPeriodo! > 0) {
                        · <span class="text-error">faltan {{ r.turnosFaltantesPeriodo }}</span>
                      } @else {
                        · <span class="text-success">cubiertos</span>
                      }
                    </p>
                  }
                </div>
                <div class="rounded-lg border border-base-300 p-4">
                  <div class="flex items-center gap-2 font-medium">
                    <app-icon name="star" [size]="16" />
                    Costo de la fidelización
                  </div>
                  @if (r.serviciosConFidelizacion > 0) {
                    <p class="mt-2 text-sm">
                      Se dejaron de cobrar <strong>{{ r.costoFidelizacion | pesos }}</strong> en {{ r.serviciosConFidelizacion }}
                      {{ r.serviciosConFidelizacion === 1 ? 'servicio' : 'servicios' }} con descuento por fidelización.
                    </p>
                  } @else {
                    <p class="mt-2 text-sm text-base-content/70">No hubo descuentos por fidelización en este período.</p>
                  }
                </div>
              </div>

              <p class="mt-3 text-xs text-base-content/60">
                @if (r.serviciosSinCosto > 0) {
                  Hay {{ r.serviciosSinCosto }} {{ r.serviciosSinCosto === 1 ? 'servicio vigente' : 'servicios vigentes' }} sin costo de insumos cargado, así que los costos pueden ser mayores. ·
                }
                Los egresos de caja no se restan acá, para no contar dos veces lo mismo que cargás como costo.
              </p>
            }
          }
        </div>
      </div>

      <!-- Clientes para recontactar -->
      <div class="card bg-base-100 shadow-sm">
        <div class="card-body">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 class="card-title text-lg">Clientes para recontactar</h2>
              <p class="text-sm text-base-content/60">No incluye a quienes ya tienen un turno reservado.</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <div class="join">
                <button class="btn join-item btn-sm" [class.btn-active]="vistaClientes() === 'inactivos'" (click)="cambiarVistaClientes('inactivos')">Dejaron de venir</button>
                <button class="btn join-item btn-sm" [class.btn-active]="vistaClientes() === 'sinVisitas'" (click)="cambiarVistaClientes('sinVisitas')">Nunca vinieron</button>
              </div>
              @if (vistaClientes() === 'inactivos') {
                <select class="select select-bordered select-sm" [ngModel]="diasInactividad()" (ngModelChange)="cambiarDias($event)" name="diasInactividad" aria-label="Días sin venir">
                  @for (d of opcionesDias; track d) {
                    <option [ngValue]="d">Más de {{ d }} días</option>
                  }
                </select>
              }
            </div>
          </div>

          @if (clientesContacto().length === 0) {
            <div class="py-8 text-center text-base-content/60">
              {{ vistaClientes() === 'inactivos' ? 'No hay clientes que hayan dejado de venir en ese plazo.' : 'No hay clientes registrados sin visitas.' }}
            </div>
          } @else {
            <div class="mt-2 overflow-x-auto">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    @if (vistaClientes() === 'inactivos') {
                      <th>Última visita</th>
                      <th class="text-right">Visitas</th>
                    } @else {
                      <th>Registrado</th>
                    }
                    <th class="text-right">Contactar</th>
                  </tr>
                </thead>
                <tbody>
                  @for (c of clientesContacto(); track c.idPersona) {
                    <tr class="hover:bg-base-200/50">
                      <td>
                        <div class="font-medium">{{ c.nombre }} {{ c.apellido }}</div>
                        <div class="text-xs text-base-content/60">{{ c.telefono || c.mail || 'Sin datos de contacto' }}</div>
                      </td>
                      @if (vistaClientes() === 'inactivos') {
                        <td>
                          {{ c.ultimaVisita | fechaAr:'media' }}
                          <div class="text-xs text-base-content/60">hace {{ c.diasSinVenir }} días</div>
                        </td>
                        <td class="text-right tabular-nums">{{ c.visitas }}</td>
                      } @else {
                        <td>{{ c.registradoEl | fechaAr:'media' }}</td>
                      }
                      <td class="text-right">
                        @if (linkWhatsapp(c); as link) {
                          <a [href]="link" target="_blank" rel="noopener" class="btn btn-sm gap-1.5 border-0 bg-[#25D366] text-white hover:bg-[#1ebe5b]">
                            <app-icon name="whatsapp" [size]="14" />
                            WhatsApp
                          </a>
                        } @else if (c.mail) {
                          <a [href]="'mailto:' + c.mail" class="btn btn-ghost btn-sm gap-1.5">
                            <app-icon name="mail" [size]="14" />
                            Mail
                          </a>
                        } @else {
                          <span class="text-xs text-base-content/50">—</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      </div>

      <!-- Modal de costos -->
      <dialog #costosModal class="modal">
        <div class="modal-box">
          <h3 class="text-lg font-bold">Costos del negocio</h3>
          <p class="mt-1 text-sm text-base-content/60">Son internos: no se muestran en la web. El costo de insumos de cada servicio se carga en Servicios.</p>
          <form (ngSubmit)="guardarCostos()" class="mt-4 space-y-4">
            <div class="form-control">
              <label class="label"><span class="label-text">Gastos fijos por mes</span></label>
              <input type="number" min="0" class="input input-bordered w-full" [(ngModel)]="costosForm.costosFijosMensuales" name="costosFijosMensuales" placeholder="Alquiler, luz, internet, impuestos…" />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Costo de una hora de trabajo</span></label>
              <input type="number" min="0" class="input input-bordered w-full" [(ngModel)]="costosForm.costoHoraTrabajo" name="costoHoraTrabajo" placeholder="0 si no le pagás por hora a nadie" />
              <label class="label"><span class="label-text-alt text-base-content/60">Lo que le pagás a un barbero por hora. Se multiplica por la duración de cada servicio.</span></label>
            </div>
            @if (errorCostos()) {
              <div class="alert alert-error py-2.5 text-sm">
                <app-icon name="alert-circle" [size]="18" />
                <span>{{ errorCostos() }}</span>
              </div>
            }
            <div class="modal-action">
              <button type="button" class="btn btn-ghost" (click)="costosModal.close()">Cancelar</button>
              <button type="submit" class="btn btn-primary" [disabled]="guardandoCostos()">Guardar</button>
            </div>
          </form>
        </div>
        <form method="dialog" class="modal-backdrop"><button>cerrar</button></form>
      </dialog>
    </div>
  `,
})
export class ReportesComponent implements OnInit {
  private readonly reportesService = inject(ReportesService);
  private readonly brandingService = inject(BrandingService);

  @ViewChild('costosModal') costosModalRef!: ElementRef<HTMLDialogElement>;

  readonly opcionesDias = [30, 45, 60, 90, 180];
  rentabilidad = signal<ReporteRentabilidad | null>(null);
  vistaClientes = signal<'inactivos' | 'sinVisitas'>('inactivos');
  diasInactividad = signal(60);
  clientesContacto = signal<ClienteInactivo[]>([]);
  costosForm: CostosNegocio = { costosFijosMensuales: 0, costoHoraTrabajo: 0 };
  guardandoCostos = signal(false);
  errorCostos = signal('');

  desde = signal(this.formatDate(new Date()));
  hasta = signal(this.formatDate(new Date()));

  resumen = signal<ReporteResumen>({
    totalIngresos: 0,
    totalEgresos: 0,
    balance: 0,
    totalTurnos: 0,
    turnosPagados: 0,
    turnosCancelados: 0,
  });
  ingresosPorDia = signal<IngresosPorDia[]>([]);
  turnosPorEstado = signal<TurnosPorEstado[]>([]);
  servicios = signal<ServicioReporte[]>([]);
  clientes = signal<ClienteReporte[]>([]);
  formasPago = signal<IngresosPorFormaPago[]>([]);

  maxIngresosPorDia = computed(() => Math.max(...this.ingresosPorDia().map((i) => i.ingresos), 0));
  maxTurnosPorEstado = computed(() => Math.max(...this.turnosPorEstado().map((t) => t.cantidad), 0));
  maxFormasPago = computed(() => Math.max(...this.formasPago().map((f) => f.monto), 0));

  ngOnInit(): void {
    this.setEsteMes();
    this.cargarClientesContacto();
  }

  cargar(): void {
    const desde = this.desde();
    const hasta = this.hasta();
    if (!desde || !hasta) return;

    this.reportesService.getResumen(desde, hasta).subscribe((data) => this.resumen.set(data));
    this.reportesService.getIngresosPorDia(desde, hasta).subscribe((data) => this.ingresosPorDia.set(data));
    this.reportesService.getTurnosPorEstado(desde, hasta).subscribe((data) => this.turnosPorEstado.set(data));
    this.reportesService.getServicios(desde, hasta, 10).subscribe((data) => this.servicios.set(data));
    this.reportesService.getClientes(desde, hasta, 10).subscribe((data) => this.clientes.set(data));
    this.reportesService.getFormasPago(desde, hasta).subscribe((data) => this.formasPago.set(data));
    this.reportesService.getRentabilidad(desde, hasta).subscribe((data) => this.rentabilidad.set(data));
  }

  // ─── Clientes para recontactar ───

  cambiarVistaClientes(vista: 'inactivos' | 'sinVisitas'): void {
    this.vistaClientes.set(vista);
    this.cargarClientesContacto();
  }

  cambiarDias(dias: number): void {
    this.diasInactividad.set(Number(dias));
    this.cargarClientesContacto();
  }

  private cargarClientesContacto(): void {
    const pedido = this.vistaClientes() === 'inactivos'
      ? this.reportesService.getClientesInactivos(this.diasInactividad())
      : this.reportesService.getClientesSinVisitas();
    pedido.subscribe((data) => this.clientesContacto.set(data));
  }

  /** Link de WhatsApp con un mensaje ya escrito para invitarlo a volver. */
  linkWhatsapp(c: ClienteInactivo): string | null {
    const negocio = this.brandingService.branding().nombre;
    const reservar = `${window.location.origin}/reservar`;
    const mensaje = this.vistaClientes() === 'inactivos'
      ? `¡Hola ${c.nombre}! Hace rato que no te vemos por ${negocio}. ¿Querés que te guardemos un turno? Podés reservarlo acá: ${reservar}`
      : `¡Hola ${c.nombre}! Te escribimos de ${negocio}. Todavía no pudimos atenderte: si querés, reservá tu turno acá: ${reservar}`;
    return whatsappDeTelefono(c.telefono, mensaje);
  }

  // ─── Costos ───

  abrirCostos(): void {
    this.errorCostos.set('');
    this.reportesService.getCostos().subscribe((c) => {
      this.costosForm = { ...c };
      this.costosModalRef.nativeElement.showModal();
    });
  }

  guardarCostos(): void {
    this.guardandoCostos.set(true);
    this.errorCostos.set('');
    this.reportesService.updateCostos({
      costosFijosMensuales: Number(this.costosForm.costosFijosMensuales) || 0,
      costoHoraTrabajo: Number(this.costosForm.costoHoraTrabajo) || 0,
    }).subscribe({
      next: () => {
        this.guardandoCostos.set(false);
        this.costosModalRef.nativeElement.close();
        this.reportesService.getRentabilidad(this.desde(), this.hasta()).subscribe((data) => this.rentabilidad.set(data));
      },
      error: (err) => {
        this.guardandoCostos.set(false);
        this.errorCostos.set(mensajeDeErrorHttp(err, 'No se pudieron guardar los costos'));
      },
    });
  }

  setHoy(): void {
    const hoy = this.formatDate(new Date());
    this.desde.set(hoy);
    this.hasta.set(hoy);
    this.cargar();
  }

  setUltimos7(): void {
    const hoy = new Date();
    const hace7 = new Date(hoy);
    hace7.setDate(hoy.getDate() - 6);
    this.desde.set(this.formatDate(hace7));
    this.hasta.set(this.formatDate(hoy));
    this.cargar();
  }

  setEsteMes(): void {
    const hoy = new Date();
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    this.desde.set(this.formatDate(inicio));
    this.hasta.set(this.formatDate(hoy));
    this.cargar();
  }

  estadoLabel(estado: string): string {
    const map: Record<string, string> = {
      PENDIENTE: 'Pendiente',
      CONFIRMADO: 'Confirmado',
      EN_PROCESO: 'En proceso',
      COMPLETADO: 'Completado',
      CANCELADO: 'Cancelado',
      NO_SHOW: 'No show',
    };
    return map[estado] || estado;
  }

  private formatDate(date: Date): string {
    return fechaLocal(date);
  }
}
