import { Component, input } from '@angular/core';

export type FactTileSurface = 'paper' | 'stone';

/**
 * P-11 Ficha de dato: the label in secondary ink and the value in Fraunces (40 px, 30 on a phone),
 * on paper or on dark stone. Each tile is its own term and description; the screen lays them out
 * in a grid with 3 px between them. Its figure follows --quipu-cifra-ficha, so a summary can make it
 * smaller.
 */
@Component({
  selector: 'app-fact-tile',
  template: `
    <dl>
      <dt>{{ label() }}</dt>
      <dd>{{ value() }}<ng-content /></dd>
    </dl>
  `,
  host: { '[class]': '"surface-" + surface()' },
  styles: `
    :host {
      display: block;
      padding: var(--quipu-relleno-ficha);
      border-radius: var(--quipu-radio);
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
      font: var(--mat-sys-headline-large);
      font-size: var(--quipu-cifra-ficha);
      line-height: 1;
      font-variant-numeric: tabular-nums;
      color: var(--quipu-tinta);
    }
    @media (max-width: 599.98px) {
      :host {
        padding: var(--quipu-relleno-ficha-movil);
      }
      dd {
        font-size: var(--quipu-cifra-ficha-movil);
      }
    }
  `,
})
export class FactTileComponent {
  readonly label = input.required<string>();
  /** The value in words; a badge or another piece can be projected instead, with no value. */
  readonly value = input('');
  readonly surface = input<FactTileSurface>('paper');
}
