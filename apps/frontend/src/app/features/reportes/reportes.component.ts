import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReportesService } from '../../shared/services/reportes.service';
import {
  ClienteReporte,
  IngresosPorDia,
  IngresosPorFormaPago,
  ReporteResumen,
  ServicioReporte,
  TurnosPorEstado,
} from '../../shared/models/reportes.model';
import { IconComponent } from '../../shared/ui/icon.component';
import { FechaArPipe } from '../../shared/pipes/fecha-ar.pipe';
import { PesosPipe } from '../../shared/pipes/pesos.pipe';
import { fechaLocal } from '../../shared/utils/fecha-local.util';

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
        <div class="rounded-lg border-t-2 border-success bg-base-100 p-5 shadow-sm">
          <div class="flex items-center justify-between text-base-content/50">
            <span class="text-sm font-medium">Ingresos</span>
            <app-icon name="trending-up" [size]="18" />
          </div>
          <div class="font-display tabular-nums mt-2 text-2xl font-medium text-success">{{ resumen().totalIngresos | pesos }}</div>
        </div>
        <div class="rounded-lg border-t-2 border-error bg-base-100 p-5 shadow-sm">
          <div class="flex items-center justify-between text-base-content/50">
            <span class="text-sm font-medium">Egresos</span>
            <app-icon name="trending-down" [size]="18" />
          </div>
          <div class="font-display tabular-nums mt-2 text-2xl font-medium text-error">{{ resumen().totalEgresos | pesos }}</div>
        </div>
        <div class="rounded-lg border-t-2 border-primary bg-base-100 p-5 shadow-sm">
          <div class="flex items-center justify-between text-base-content/50">
            <span class="text-sm font-medium">Balance</span>
            <app-icon name="wallet" [size]="18" />
          </div>
          <div class="font-display tabular-nums mt-2 text-2xl font-medium" [class.text-success]="resumen().balance >= 0" [class.text-error]="resumen().balance < 0">
            {{ resumen().balance | pesos }}
          </div>
        </div>
        <div class="rounded-lg border-t-2 border-accent bg-base-100 p-5 shadow-sm">
          <div class="flex items-center justify-between text-base-content/50">
            <span class="text-sm font-medium">Turnos</span>
            <app-icon name="calendar" [size]="18" />
          </div>
          <div class="font-display tabular-nums mt-2 text-2xl font-medium">{{ resumen().totalTurnos }}</div>
          <div class="mt-1 text-xs text-base-content/50">{{ resumen().turnosPagados }} pagados · {{ resumen().turnosCancelados }} cancelados</div>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-2">
        <!-- Ingresos por día -->
        <div class="card bg-base-100 shadow-sm">
          <div class="card-body">
            <h2 class="card-title text-lg">Ingresos por día</h2>
            @if (ingresosPorDia().length === 0) {
              <div class="py-8 text-center text-base-content/50">Sin datos en este período</div>
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
              <div class="py-8 text-center text-base-content/50">Sin datos en este período</div>
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
              <div class="py-8 text-center text-base-content/50">Sin datos en este período</div>
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
              <div class="py-8 text-center text-base-content/50">Sin datos en este período</div>
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
            <div class="py-8 text-center text-base-content/50">Sin datos en este período</div>
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
    </div>
  `,
})
export class ReportesComponent implements OnInit {
  private readonly reportesService = inject(ReportesService);

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
