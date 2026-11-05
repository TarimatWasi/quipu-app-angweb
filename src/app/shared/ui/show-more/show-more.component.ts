import { Component, input, output } from '@angular/core';

/**
 * P-22 Mostrar más: under a table or cards, the summary «Mostrando X de Y cargados» and the
 * secondary «Mostrar más» button (full width on a phone), which asks for the next page. The button
 * goes away when there are no more pages; while loading it says «Cargando…» and what is shown stays.
 * A screen that says the summary next to its filters turns it off here with `summary` false.
 */
@Component({
  selector: 'app-show-more',
  host: { '[class.centered]': '!summary()' },
  template: `
    @if (summary()) {
      <output class="summary">Mostrando {{ shown() }} de {{ loaded() }} cargados</output>
    }
    @if (hasMore()) {
      <button
        class="quipu-button quipu-button--secondary"
        type="button"
        [disabled]="loading()"
        (click)="more.emit()"
      >
        {{ loading() ? 'Cargando…' : 'Mostrar más' }}
      </button>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem 1.5rem;
      margin-top: 1rem;
    }
    :host(.centered) {
      justify-content: center;
    }
    .summary {
      font-size: 0.9375rem;
      color: var(--quipu-tinta-secundaria);
      font-variant-numeric: tabular-nums;
    }
    @media (max-width: 599.98px) {
      button {
        flex: 1 1 100%;
      }
    }
  `,
})
export class ShowMoreComponent {
  /** Rows on screen (after the filters). */
  readonly shown = input.required<number>();
  /** Rows loaded so far from the BFF. */
  readonly loaded = input.required<number>();
  readonly hasMore = input(false);
  readonly loading = input(false);
  /** False when the screen already says «Mostrando X de Y» elsewhere (A3): only the button, centered. */
  readonly summary = input(true);
  readonly more = output();
}
