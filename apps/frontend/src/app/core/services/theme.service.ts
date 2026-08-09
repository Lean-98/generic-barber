import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly STORAGE_KEY = 'peluqueria-theme';
  private readonly THEMES = ['light', 'dark'] as const;
  theme = signal<'light' | 'dark'>('light');

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
    this.theme.set(this.theme() === 'light' ? 'dark' : 'light');
  }

  private getStoredTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem(this.STORAGE_KEY);
    return saved === 'dark' ? 'dark' : 'light';
  }

  private storeTheme(theme: 'light' | 'dark'): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.STORAGE_KEY, theme);
  }

  private applyTheme(theme: 'light' | 'dark'): void {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
  }
}
