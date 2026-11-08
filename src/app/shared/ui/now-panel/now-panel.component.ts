import { Component, input } from '@angular/core';
import { SkeletonBlockComponent } from '../skeleton/skeleton-block.component';

/**
 * «Lo que toca ahora» of a list (A3, A5): a big figure, what it counts, a sentence of context and,
 * projected, at most one primary action. The block itself is the kit's `.quipu-now-panel`.
 */
@Component({
  selector: 'app-now-panel',
  imports: [SkeletonBlockComponent],
  template: `
    <section class="quipu-now-panel" [attr.aria-labelledby]="headingId()">
      <h2 class="cdk-visually-hidden" [id]="headingId()">Lo que toca ahora</h2>
      <div class="what">
        <p class="headline">
          <span class="figure" [class.urgent]="urgent()">
            @if (loading()) {
              <app-skeleton-block width="3ch" height="1lh" />
            } @else {
              {{ figure() }}
            }
          </span>
          <span class="label">
            @if (loading()) {
              <app-skeleton-block width="12rem" height="1lh" />
            } @else {
              {{ label() }}
            }
          </span>
        </p>
        <p class="text">
          @if (loading()) {
            <app-skeleton-block width="70%" height="1lh" />
          } @else {
            {{ text() }}
          }
        </p>
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
    .figure.urgent {
      color: var(--quipu-estado-atrasado-texto);
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
  /** A count or an amount; A1 also says «Al día» or «Bienvenida». */
  readonly figure = input<number | string>('');
  /** The figure in red ink: what waits is late or was rejected. */
  readonly urgent = input(false);
  readonly label = input('');
  readonly text = input('');
  /**
   * Loading: the heading, the surface, the paddings and the type are the panel's own and only the
   * figure, what it counts and the sentence are blocks, so nothing moves when the data arrives.
   */
  readonly loading = input(false);
  /** Id of its hidden heading, unique in the page. */
  readonly headingId = input('now-title');
}
