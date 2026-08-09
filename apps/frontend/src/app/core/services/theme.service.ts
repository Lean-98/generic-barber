import { Injectable, signal, effect } from '@angular/core';

export type ThemeName = 'barber' | 'barber-noche';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly STORAGE_KEY = 'peluqueria-theme';
  theme = signal<ThemeName>('barber');

  constructor() {
    const saved = this.getStoredTheme();
    this.theme.set(saved);

    effect(() => {
      const current = this.theme();
      this.applyTheme(current);
      this.storeTheme(current);
    });
  }

  toggle(): void {
    this.theme.set(this.theme() === 'barber' ? 'barber-noche' : 'barber');
  }

  private getStoredTheme(): ThemeName {
    if (typeof window === 'undefined') return 'barber';
    const saved = localStorage.getItem(this.STORAGE_KEY);
    return saved === 'barber-noche' ? 'barber-noche' : 'barber';
  }

  private storeTheme(theme: ThemeName): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.STORAGE_KEY, theme);
  }

  private applyTheme(theme: ThemeName): void {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
  }
}
