import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../shared/services/auth.service';
import { ThemeService } from './services/theme.service';
import { IconComponent } from '../shared/ui/icon.component';
import { BrandMarkComponent } from '../shared/ui/brand-mark.component';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  exact?: boolean;
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, BrandMarkComponent],
  template: `
    <div class="min-h-screen bg-base-200">
      <!-- Mobile top bar -->
      <nav class="navbar sticky top-0 z-50 bg-neutral px-4 text-neutral-content shadow-sm md:hidden">
        <div class="navbar-start gap-2">
          <button class="btn btn-ghost btn-square text-neutral-content" (click)="menuOpen.set(!menuOpen())" aria-label="Menu">
            <app-icon name="menu" [size]="20" />
          </button>
          <a routerLink="/dashboard" class="flex items-center gap-2 px-1">
            <app-brand-mark barHeight="h-6" />
          </a>
        </div>
        <div class="navbar-end gap-1">
          <button class="btn btn-ghost btn-square btn-sm text-neutral-content" (click)="toggleTheme()" [attr.aria-label]="themeService.theme() === 'barber-noche' ? 'Modo claro' : 'Modo oscuro'">
            @if (themeService.theme() === 'barber-noche') {
              <app-icon name="sun" [size]="18" />
            } @else {
              <app-icon name="moon" [size]="18" />
            }
          </button>
          <button class="btn btn-ghost btn-sm gap-2 text-neutral-content" (click)="logout()">
            <app-icon name="log-out" [size]="18" />
            <span class="hidden sm:inline">Salir</span>
          </button>
        </div>
      </nav>

      <!-- Mobile menu overlay -->
      @if (menuOpen()) {
        <div class="fixed inset-0 z-40 md:hidden" (click)="menuOpen.set(false)">
          <div class="absolute inset-0 bg-black/50"></div>
          <aside class="absolute left-0 top-0 h-full w-64 bg-neutral text-neutral-content shadow-xl" (click)="$event.stopPropagation()">
            <div class="flex h-16 items-center gap-2 border-b border-white/10 px-5">
              <app-brand-mark barHeight="h-6" />
            </div>
            <ul class="flex flex-col gap-1 p-3">
              @for (item of navItems; track item.route) {
                <li>
                  <a
                    [routerLink]="item.route"
                    class="flex items-center gap-3 rounded-md border-l-2 border-transparent px-3 py-2.5 text-sm font-medium text-neutral-content/70 transition-colors duration-200 hover:border-l-primary hover:bg-white/5 hover:text-neutral-content"
                    routerLinkActive="!border-l-primary bg-white/[0.07] !text-neutral-content"
                    [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
                    (click)="menuOpen.set(false)"
                  >
                    <app-icon [name]="item.icon" [size]="18" />
                    {{ item.label }}
                  </a>
                </li>
              }
              <li class="mt-3 border-t border-white/10 pt-3">
                <a class="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-neutral-content/70 transition-colors duration-200 hover:bg-white/5 hover:text-neutral-content" (click)="logout()">
                  <app-icon name="log-out" [size]="18" />
                  Salir
                </a>
              </li>
            </ul>
          </aside>
        </div>
      }

      <!-- Desktop sidebar -->
      <aside class="fixed left-0 top-0 z-50 hidden h-screen w-64 flex-col bg-neutral text-neutral-content md:flex">
        <div class="flex h-16 items-center gap-3 border-b border-white/10 px-6">
          <app-brand-mark textSize="text-lg tracking-tight" />
        </div>

        <nav class="flex-1 overflow-y-auto p-3">
          <ul class="flex flex-col gap-1">
            @for (item of navItems; track item.route) {
              <li>
                <a
                  [routerLink]="item.route"
                  class="flex items-center gap-3 rounded-md border-l-2 border-transparent px-3 py-2.5 text-sm font-medium text-neutral-content/70 transition-colors duration-200 hover:border-l-primary hover:bg-white/5 hover:text-neutral-content"
                  routerLinkActive="!border-l-primary bg-white/[0.07] !text-neutral-content"
                  [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
                >
                  <app-icon [name]="item.icon" [size]="18" />
                  {{ item.label }}
                </a>
              </li>
            }
          </ul>
        </nav>

        <div class="space-y-3 border-t border-white/10 p-4">
          <button class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-neutral-content/70 transition-colors duration-200 hover:bg-white/5 hover:text-neutral-content" (click)="toggleTheme()">
            @if (themeService.theme() === 'barber-noche') {
              <app-icon name="sun" [size]="16" />
              <span>Modo claro</span>
            } @else {
              <app-icon name="moon" [size]="16" />
              <span>Modo oscuro</span>
            }
          </button>

          @if (authService.currentUser(); as user) {
            <div class="flex items-center gap-3 rounded-md bg-white/5 p-2.5">
              <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-content">
                {{ user.usuario.charAt(0).toUpperCase() }}
              </div>
              <div class="flex-1 overflow-hidden">
                <p class="truncate text-sm font-medium">{{ user.usuario }}</p>
                <p class="truncate text-xs text-neutral-content/50">{{ user.email }}</p>
              </div>
              <button class="btn btn-ghost btn-square btn-sm text-neutral-content/70 hover:text-neutral-content" (click)="logout()" aria-label="Salir">
                <app-icon name="log-out" [size]="16" />
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
    { label: 'Marca', route: '/configuracion/marca', icon: 'image' },
    { label: 'Google Calendar', route: '/configuracion/google-calendar', icon: 'settings' },
  ];

  logout(): void {
    this.authService.logout();
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }
}
