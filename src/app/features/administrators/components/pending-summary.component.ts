import { Component, input } from '@angular/core';
import type { PendingSummary } from '../model/administrator-texts';

/**
 * A7 «Lo que toca ahora»: one card on dark stone with the figure in Fraunces, the key sentence in bold
 * and what to do. With accounts not yet activated it says whose; otherwise, that nothing waits.
 */
@Component({
  selector: 'app-pending-summary',
  template: `
    <section aria-labelledby="pending-summary-title">
      <h2 id="pending-summary-title">Lo que toca ahora</h2>
      <div class="card">
        <p class="figure">{{ summary().figure }}</p>
        <p class="heading">{{ summary().heading }}</p>
        <p class="text">{{ summary().text }}</p>
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    h2 {
      margin: 0 0 0.75rem;
    }
    .card {
      display: grid;
      gap: 0.5rem;
      padding: var(--quipu-relleno-panel);
      border-radius: var(--quipu-radio);
      background: var(--quipu-piedra-oscura);
    }
    p {
      margin: 0;
    }
    .figure {
      font: var(--mat-sys-headline-large);
      font-size: var(--quipu-cifra-ficha);
      line-height: 1.1;
      font-variant-numeric: tabular-nums;
    }
    .heading {
      font-weight: var(--quipu-peso-enfasis);
      overflow-wrap: anywhere;
    }
    .text {
      max-width: var(--quipu-texto-medida);
      color: var(--quipu-tinta-secundaria);
    }
    @media (max-width: 599.98px) {
      .card {
        padding: var(--quipu-relleno-panel-movil);
      }
      .figure {
        font-size: var(--quipu-cifra-ficha-movil);
      }
    }
  `,
})
export class PendingSummaryComponent {
  readonly summary = input.required<PendingSummary>();
}
