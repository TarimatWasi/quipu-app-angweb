import { Component, input } from '@angular/core';
import { SkeletonBlockComponent } from './skeleton-block.component';

/** Uses the kit's fact surface and spacing, with an optional full-width first fact. */
@Component({
  selector: 'app-skeleton-facts',
  imports: [SkeletonBlockComponent],
  host: { 'aria-hidden': 'true' },
  template: `
    @for (label of labels(); track $index; let first = $first) {
      <div [class.wide]="first && wideFirst()">
        <span>{{ label }}</span
        ><app-skeleton-block width="80%" height="1.75rem" />
      </div>
    }
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--quipu-franja);
    }
    div {
      --quipu-skeleton-fondo: var(--quipu-alpaca);
      display: grid;
      gap: 0.75rem;
      padding: var(--quipu-relleno-tarjeta);
      background: var(--quipu-piedra-oscura);
      min-width: 0;
    }
    span {
      color: var(--quipu-tinta-secundaria);
      font: var(--mat-sys-body-small);
    }
    .wide {
      grid-column: var(--skeleton-wide-column, 1 / -1);
    }
  `,
})
export class SkeletonFactsComponent {
  readonly labels = input.required<readonly string[]>();
  readonly wideFirst = input(true);
}
