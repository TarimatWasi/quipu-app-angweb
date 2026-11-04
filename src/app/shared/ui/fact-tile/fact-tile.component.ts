import { Component, input } from '@angular/core';

export type FactTileSurface = 'paper' | 'stone';

/**
 * P-11 Ficha de dato: the label in secondary ink and the value in Fraunces (40 px, 30 on a phone),
 * on paper or on dark stone. Each tile is its own term and description; the screen lays them out
 * in a grid with 3 px between them.
 */
@Component({
  selector: 'app-fact-tile',
  template: `
    <dl>
      <dt>{{ label() }}</dt>
      <dd>{{ value() }}</dd>
    </dl>
  `,
  host: { '[class]': '"surface-" + surface()' },
  styles: `
    :host {
      display: block;
      padding: 1.125rem 1.25rem 1.25rem;
      border-radius: 4px;
      background: var(--quipu-alpaca);
    }
    :host(.surface-stone) {
      background: var(--quipu-piedra-oscura);
    }
    dl {
      margin: 0;
    }
    dt {
      font-size: 0.9375rem;
      font-weight: 700;
      color: var(--quipu-tinta-secundaria);
    }
    dd {
      margin: 0.5rem 0 0;
      font-family: 'Fraunces', Georgia, serif;
      font-size: 2.5rem;
      font-weight: 600;
      line-height: 1;
      font-variant-numeric: tabular-nums;
      color: var(--quipu-tinta);
    }
    @media (max-width: 599.98px) {
      :host {
        padding: 0.875rem 1rem 1rem;
      }
      dd {
        font-size: 1.875rem;
      }
    }
  `,
})
export class FactTileComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly surface = input<FactTileSurface>('paper');
}
