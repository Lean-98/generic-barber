import { Component, computed, input, output } from '@angular/core';

/** Marcador de "…" entre rangos de páginas no contiguos. */
const ELIPSIS = -1;

@Component({
  selector: 'app-pagination',
  standalone: true,
  template: `
    @if (totalPages() > 1) {
      <div class="flex flex-col items-center justify-between gap-3 pt-2 sm:flex-row">
        <span class="text-sm text-base-content/60">
          Página {{ page() }} de {{ totalPages() }} · {{ total() }} {{ total() === 1 ? 'registro' : 'registros' }}
        </span>
        <div class="join">
          <button
            type="button"
            class="join-item btn btn-sm"
            [disabled]="page() <= 1"
            (click)="cambiarPagina(page() - 1)"
            aria-label="Página anterior"
          >
            «
          </button>
          @for (p of paginasVisibles(); track $index) {
            @if (p === elipsis) {
              <button type="button" class="join-item btn btn-sm btn-disabled">…</button>
            } @else {
              <button
                type="button"
                class="join-item btn btn-sm"
                [class.btn-active]="p === page()"
                (click)="cambiarPagina(p)"
              >
                {{ p }}
              </button>
            }
          }
          <button
            type="button"
            class="join-item btn btn-sm"
            [disabled]="page() >= totalPages()"
            (click)="cambiarPagina(page() + 1)"
            aria-label="Página siguiente"
          >
            »
          </button>
        </div>
      </div>
    }
  `,
})
export class PaginationComponent {
  page = input.required<number>();
  totalPages = input.required<number>();
  total = input<number>(0);
  pageChange = output<number>();

  protected readonly elipsis = ELIPSIS;

  paginasVisibles = computed<number[]>(() => {
    const total = this.totalPages();
    const actual = this.page();
    const ventana = 1;
    const paginas: number[] = [];

    const agregar = (p: number) => {
      if (p >= 1 && p <= total && !paginas.includes(p)) paginas.push(p);
    };

    agregar(1);
    for (let p = actual - ventana; p <= actual + ventana; p++) agregar(p);
    agregar(total);
    paginas.sort((a, b) => a - b);

    const resultado: number[] = [];
    for (let i = 0; i < paginas.length; i++) {
      if (i > 0 && paginas[i] - paginas[i - 1] > 1) {
        resultado.push(ELIPSIS);
      }
      resultado.push(paginas[i]);
    }
    return resultado;
  });

  cambiarPagina(p: number): void {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.pageChange.emit(p);
  }
}
