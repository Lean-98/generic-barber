import { Component, OnInit, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleCalendarService, GoogleCalendarStatus } from '../../shared/services/google-calendar.service';
import { IconComponent } from '../../shared/ui/icon.component';

@Component({
  selector: 'app-google-calendar-config',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="space-y-6 text-base-content">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Google Calendar</h1>
        <p class="text-base-content/60 mt-1">Configuración de la integración con Google Calendar</p>
      </div>

      <div class="card bg-base-100 shadow-sm">
        <div class="card-body">
          @if (loading()) {
            <div class="flex items-center justify-center gap-2 py-12">
              <app-icon name="loader" [size]="20" class="animate-spin" />
              <span class="text-base-content/70">Cargando estado...</span>
            </div>
          } @else if (error()) {
            <div class="alert alert-error">
              <app-icon name="alert-circle" [size]="20" />
              <span>{{ error() }}</span>
            </div>
          } @else {
            <div class="flex items-start gap-4">
              <div class="rounded-xl bg-base-200 p-3">
                <app-icon name="calendar" [size]="32" class="text-primary" />
              </div>
              <div class="flex-1">
                <h2 class="text-xl font-semibold">Sincronización de turnos</h2>
                <p class="mt-1 text-base-content/70">
                  Al conectar Google Calendar, cada turno que se cree, cancele o modifique se reflejará automáticamente en el calendario de Google.
                </p>

                <div class="mt-4 flex items-center gap-2">
                  @if (status()?.connected) {
                    <span class="badge badge-success gap-1">
                      <app-icon name="check" [size]="12" />
                      Conectado
                    </span>
                    @if (status()?.calendarId) {
                      <span class="text-sm text-base-content/60">Calendario: {{ status()?.calendarId }}</span>
                    }
                  } @else if (status()?.configured) {
                    <span class="badge badge-warning gap-1">No conectado</span>
                  } @else {
                    <span class="badge badge-ghost gap-1">No configurado</span>
                  }
                </div>

                @if (status()?.message) {
                  <div class="mt-4 text-sm text-base-content/70">{{ status()?.message }}</div>
                }
              </div>
            </div>

            <div class="divider"></div>

            <div class="flex flex-wrap items-center gap-3">
              @if (status()?.connected) {
                <button class="btn btn-error gap-2" (click)="disconnect()" [disabled]="connecting()">
                  @if (connecting()) {
                    <app-icon name="loader" [size]="16" class="animate-spin" />
                  } @else {
                    <app-icon name="x" [size]="16" />
                  }
                  Desconectar
                </button>
              } @else if (status()?.configured) {
                <button class="btn btn-primary gap-2" (click)="connect()" [disabled]="connecting()">
                  @if (connecting()) {
                    <app-icon name="loader" [size]="16" class="animate-spin" />
                  } @else {
                    <app-icon name="check" [size]="16" />
                  }
                  Conectar con Google
                </button>
              } @else {
                <div class="alert alert-warning">
                  <app-icon name="alert-circle" [size]="18" />
                  <span>
                    La integración no está habilitada en el servidor. El administrador debe configurar las variables de entorno
                    <code>GOOGLE_CLIENT_ID</code>, <code>GOOGLE_CLIENT_SECRET</code> y <code>GOOGLE_REDIRECT_URI</code>.
                  </span>
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class GoogleCalendarConfigComponent implements OnInit, OnDestroy {
  private readonly googleCalendarService = inject(GoogleCalendarService);
  status = signal<GoogleCalendarStatus | null>(null);
  loading = signal(true);
  connecting = signal(false);
  error = signal<string | null>(null);

  private messageHandler = this.onMessage.bind(this);

  ngOnInit(): void {
    this.loadStatus();
    window.addEventListener('message', this.messageHandler);
  }

  ngOnDestroy(): void {
    window.removeEventListener('message', this.messageHandler);
  }

  loadStatus(): void {
    this.loading.set(true);
    this.error.set(null);
    this.googleCalendarService.getStatus().subscribe({
      next: (s) => {
        this.status.set(s);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'No se pudo obtener el estado de Google Calendar');
        this.loading.set(false);
      },
    });
  }

  connect(): void {
    this.connecting.set(true);
    this.googleCalendarService.getAuthUrl().subscribe({
      next: ({ authUrl }) => {
        this.connecting.set(false);
        const width = 500;
        const height = 600;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        window.open(
          authUrl,
          'googleCalendarAuth',
          `width=${width},height=${height},top=${top},left=${left},popup=1`,
        );
      },
      error: (err) => {
        this.connecting.set(false);
        this.error.set(err.error?.message || 'No se pudo obtener la URL de autorización');
      },
    });
  }

  disconnect(): void {
    this.connecting.set(true);
    this.googleCalendarService.disconnect().subscribe({
      next: () => {
        this.connecting.set(false);
        this.loadStatus();
      },
      error: (err) => {
        this.connecting.set(false);
        this.error.set(err.error?.message || 'No se pudo desconectar Google Calendar');
      },
    });
  }

  private onMessage(event: MessageEvent): void {
    if (event.data?.type !== 'GOOGLE_CALENDAR_CALLBACK') return;
    if (event.data.status === 'success') {
      this.loadStatus();
    } else {
      this.error.set(event.data.message || 'Error al conectar Google Calendar');
    }
  }
}
