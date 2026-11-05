import { Component, input } from '@angular/core';

/**
 * «Lo que toca ahora» of a list (A3, A5): a big figure, what it counts, a sentence of context and,
 * projected, at most one primary action. The block itself is the kit's `.quipu-now-panel`.
 */
@Component({
  selector: 'app-now-panel',
  template: `
    <section class="quipu-now-panel" [attr.aria-labelledby]="headingId()">
      <h2 class="cdk-visually-hidden" [id]="headingId()">Lo que toca ahora</h2>
      <div class="what">
        <p class="headline">
          <span class="figure">{{ figure() }}</span>
          <span class="label">{{ label() }}</span>
        </p>
        <p class="text">{{ text() }}</p>
      </div>
      <ng-content />
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
    }
  `,
})
export class NowPanelComponent {
  readonly figure = input.required<number>();
  readonly label = input.required<string>();
  readonly text = input.required<string>();
  /** Id of its hidden heading, unique in the page. */
  readonly headingId = input('now-title');
}
