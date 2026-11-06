import { Component, computed, input } from '@angular/core';
import { SkeletonBlockComponent } from './skeleton-block.component';

/** Repeated content cards for histories or account entries, without fabricated business data. */
@Component({
  selector: 'app-skeleton-cards',
  imports: [SkeletonBlockComponent],
  host: { 'aria-hidden': 'true' },
  template: `
    @for (row of rows(); track row) {
      <div class="card">
        <div class="head">
          <app-skeleton-block width="60%" height="1.25rem" /><app-skeleton-block shape="badge" />
        </div>
        <app-skeleton-block width="95%" />
        <app-skeleton-block width="75%" />
        @if (action()) {
          <app-skeleton-block shape="rectangle" width="10rem" />
        }
      </div>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--quipu-franja);
    }
    .card {
      display: grid;
      gap: 0.75rem;
      padding: var(--quipu-relleno-tarjeta);
      background: var(--quipu-alpaca);
      min-width: 0;
    }
    .head {
      display: flex;
      align-items: start;
      justify-content: space-between;
      gap: 1rem;
    }
  `,
})
export class SkeletonCardsComponent {
  readonly count = input(3);
  readonly action = input(false);
  protected readonly rows = computed(() =>
    Array.from(
      { length: Math.min(20, Math.max(1, Math.trunc(this.count()) || 3)) },
      (_, index) => index,
    ),
  );
}
