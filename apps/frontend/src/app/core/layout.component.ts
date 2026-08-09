import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../shared/services/auth.service';
import { ThemeService } from './services/theme.service';
import { IconComponent } from '../shared/ui/icon.component';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  exact?: boolean;
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  template: `
    <div class="min-h-screen bg-base-200">
      <!-- Mobile top bar -->
      <nav class="navbar sticky top-0 z-50 border-b border-base-300 bg-base-100/95 px-4 backdrop-blur shadow-sm md:hidden">
        <div class="navbar-start gap-2">
          <button class="btn btn-ghost btn-square text-base-content" (click)="menuOpen.set(!menuOpen())" aria-label="Menu">
            <app-icon name="menu" [size]="20" />
          </button>
          <a routerLink="/dashboard" class="btn btn-ghost px-2 text-lg font-bold text-base-content">
            <app-icon name="scissors" [size]="22" className="text-primary" />
            <span>Peluquería</span>
          </a>
        </div>
        <div class="navbar-end gap-2">
          <button class="btn btn-ghost btn-square btn-sm text-base-content" (click)="toggleTheme()" [attr.aria-label]="themeService.theme() === 'dark' ? 'Modo claro' : 'Modo oscuro'">
            @if (themeService.theme() === 'dark') {
              <app-icon name="sun" [size]="18" />
            } @else {
              <app-icon name="moon" [size]="18" />
            }
          </button>
          <button class="btn btn-ghost btn-sm gap-2 text-base-content" (click)="logout()">
            <app-icon name="log-out" [size]="18" />
            <span class="hidden sm:inline">Salir</span>
          </button>
        </div>
      </nav>

      <!-- Mobile menu overlay -->
      @if (menuOpen()) {
        <div class="fixed inset-0 z-40 md:hidden" (click)="menuOpen.set(false)">
          <div class="absolute inset-0 bg-black/50"></div>
          <aside class="absolute left-0 top-0 h-full w-64 border-r border-base-300 bg-base-100 shadow-xl" (click)="$event.stopPropagation()">
            <div class="flex h-16 items-center gap-2 border-b border-base-300 px-4">
              <app-icon name="scissors" [size]="22" className="text-primary" />
              <span class="text-lg font-bold text-base-content">Peluquería</span>
            </div>
            <ul class="menu menu-lg gap-1 p-4">
              @for (item of navItems; track item.route) {
                <li>
                  <a
                    [routerLink]="item.route"
                    class="text-base-content hover:bg-base-200"
                    routerLinkActive="bg-primary text-primary-content hover:bg-primary"
                    [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
                    (click)="menuOpen.set(false)"
                  >
                    <app-icon [name]="item.icon" [size]="20" />
                    {{ item.label }}
                  </a>
                </li>
              }
              <li class="mt-4 border-t border-base-300 pt-4">
                <a class="text-base-content hover:bg-base-200" (click)="logout()">
                  <app-icon name="log-out" [size]="20" />
                  Salir
                </a>
              </li>
            </ul>
          </aside>
        </div>
      }

      <!-- Desktop sidebar -->
      <aside class="fixed left-0 top-0 z-50 hidden h-screen w-64 flex-col border-r border-base-300 bg-base-100 shadow-sm md:flex">
        <div class="flex h-16 items-center gap-3 border-b border-base-300 px-6">
          <app-icon name="scissors" [size]="24" className="text-primary" />
          <span class="text-lg font-bold text-base-content">Peluquería</span>
        </div>

        <nav class="flex-1 overflow-y-auto p-4">
          <ul class="menu menu-lg gap-2">
            @for (item of navItems; track item.route) {
              <li>
                <a
                  [routerLink]="item.route"
                  class="text-base-content hover:bg-base-200"
                  routerLinkActive="bg-primary text-primary-content hover:bg-primary"
                  [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
                >
                  <app-icon [name]="item.icon" [size]="20" />
                  {{ item.label }}
                </a>
              </li>
            }
          </ul>
        </nav>

        <div class="border-t border-base-300 p-4 space-y-3">
          <button class="btn btn-ghost btn-sm w-full justify-start gap-2 text-base-content hover:bg-base-200" (click)="toggleTheme()">
            @if (themeService.theme() === 'dark') {
              <app-icon name="sun" [size]="18" />
              <span>Modo claro</span>
            } @else {
              <app-icon name="moon" [size]="18" />
              <span>Modo oscuro</span>
            }
          </button>

          @if (authService.currentUser(); as user) {
            <div class="flex items-center gap-3">
              <div class="avatar placeholder">
                <div class="bg-primary text-primary-content w-10 rounded-full">
                  <span class="text-sm">{{ user.usuario.charAt(0).toUpperCase() }}</span>
                </div>
              </div>
              <div class="flex-1 overflow-hidden">
                <p class="truncate text-sm font-medium text-base-content">{{ user.usuario }}</p>
                <p class="truncate text-xs text-base-content/60">{{ user.email }}</p>
              </div>
              <button class="btn btn-ghost btn-square btn-sm text-base-content hover:bg-base-200" (click)="logout()" aria-label="Salir">
                <app-icon name="log-out" [size]="18" />
              </button>
            </div>
          }
        </div>
      </aside>

      <main class="min-h-screen bg-base-200 md:ml-64">
        <div class="container mx-auto px-4 py-6 lg:px-8 lg:py-8">
          <router-outlet />
        </div>
      </main>
    </div>
  `,
})
export class LayoutComponent {
  authService = inject(AuthService);
  themeService = inject(ThemeService);
  router = inject(Router);
  menuOpen = signal(false);

  navItems: NavItem[] = [
    { label: 'Dashboard', route: '/dashboard', icon: 'layout-grid', exact: true },
    { label: 'Turnos', route: '/turnos', icon: 'calendar' },
    { label: 'Servicios', route: '/servicios', icon: 'scissors' },
    { label: 'Clientes', route: '/personas', icon: 'users' },
    { label: 'Caja', route: '/caja', icon: 'wallet' },
    { label: 'Reportes', route: '/reportes', icon: 'bar-chart' },
    { label: 'Configuración', route: '/configuracion/google-calendar', icon: 'settings' },
  ];

  logout(): void {
    this.authService.logout();
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }
}
