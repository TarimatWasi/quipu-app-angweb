import { Component, input, output } from '@angular/core';
import type { NowPanel } from '../model/guest-list-texts';

/**
 * A3 «Lo que toca ahora»: how many guests have not activated their access, in a big figure, what
 * that blocks and «Ver sin activar», which the page turns into the filter Estado = Pendiente.
 */
@Component({
  selector: 'app-guests-now-panel',
  template: `
    <section class="quipu-now-panel" aria-labelledby="guests-now-title">
      <h2 id="guests-now-title" class="cdk-visually-hidden">Lo que toca ahora</h2>
      <div class="what">
        <p class="headline">
          <span class="figure">{{ panel().figure }}</span>
          <span class="label">{{ panel().label }}</span>
        </p>
        <p class="text">{{ panel().text }}</p>
      </div>
      <button class="quipu-button quipu-button--primary" type="button" (click)="showPending.emit()">
        Ver sin activar
      </button>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    section {
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 1rem 2rem;
    }
    .what {
      display: grid;
      gap: 0.5rem;
    }
    .headline {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0 0.75rem;
    }
    .figure {
      font: var(--mat-sys-display-medium);
      font-variant-numeric: tabular-nums;
    }
    .label {
      font: var(--mat-sys-title-medium);
    }
    .text {
      color: var(--quipu-tinta-secundaria);
    }
    @media (max-width: 599.98px) {
      section {
        grid-template-columns: minmax(0, 1fr);
      }
      .figure {
        font-size: var(--mat-sys-headline-medium-size);
      }
      button {
        width: 100%;
      }
    }
  `,
})
export class GuestsNowPanelComponent {
  readonly panel = input.required<NowPanel>();
  /** «Ver sin activar»: the page filters Estado = Pendiente de activación. */
  readonly showPending = output();
}
