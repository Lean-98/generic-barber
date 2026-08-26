import { Routes } from '@angular/router';
import { authGuard, publicGuard } from './core/guards/auth.guard';
import { LayoutComponent } from './core/layout.component';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/landing/landing.component').then((m) => m.LandingComponent),
  },
  {
    path: 'login',
    canActivate: [publicGuard],
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'forgot-password',
    canActivate: [publicGuard],
    loadComponent: () => import('./features/auth/forgot-password.component').then((m) => m.ForgotPasswordComponent),
  },
  {
    path: 'reset-password',
    canActivate: [publicGuard],
    loadComponent: () => import('./features/auth/reset-password.component').then((m) => m.ResetPasswordComponent),
  },
  {
    path: 'reservar',
    loadComponent: () => import('./features/reservas/reservar.component').then((m) => m.ReservarComponent),
  },
  {
    path: 'tienda',
    loadComponent: () => import('./features/landing/tienda.component').then((m) => m.TiendaComponent),
  },
  {
    path: 'cursos-info',
    loadComponent: () => import('./features/landing/cursos-info.component').then((m) => m.CursosInfoComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    component: LayoutComponent,
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'turnos',
        loadComponent: () => import('./features/turnos/turnos.component').then((m) => m.TurnosComponent),
      },
      {
        path: 'turnos/nuevo',
        loadComponent: () => import('./features/turnos/turno-form.component').then((m) => m.TurnoFormComponent),
      },
      {
        path: 'servicios',
        loadComponent: () => import('./features/servicios/servicios.component').then((m) => m.ServiciosComponent),
      },
      {
        path: 'personas',
        loadComponent: () => import('./features/personas/personas.component').then((m) => m.PersonasComponent),
      },
      {
        path: 'caja',
        loadComponent: () => import('./features/caja/caja.component').then((m) => m.CajaComponent),
      },
      {
        path: 'reportes',
        loadComponent: () => import('./features/reportes/reportes.component').then((m) => m.ReportesComponent),
      },
      {
        path: 'productos',
        loadComponent: () => import('./features/productos/productos.component').then((m) => m.ProductosComponent),
      },
      {
        path: 'cursos',
        loadComponent: () => import('./features/cursos/cursos.component').then((m) => m.CursosComponent),
      },
      {
        path: 'configuracion/google-calendar',
        loadComponent: () => import('./features/config/google-calendar-config.component').then((m) => m.GoogleCalendarConfigComponent),
      },
      {
        path: 'configuracion/marca',
        loadComponent: () => import('./features/config/branding-config.component').then((m) => m.BrandingConfigComponent),
      },
    ],
  },
];
