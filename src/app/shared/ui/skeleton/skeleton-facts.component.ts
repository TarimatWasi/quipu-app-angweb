import { Component, input } from '@angular/core';
import { FactTileComponent } from '../fact-tile/fact-tile.component';
import { SkeletonBlockComponent } from './skeleton-block.component';

/**
 * The real fact tiles with a block only where the API will put the value: the label, the surface,
 * the type, the padding and the height of the figure are the tile's own, so nothing changes when
 * the data arrives. `hints` is parallel to `labels`: a text is a fixed hint (shown as it is), `null`
 * is a hint that comes from the API (a block), and a missing entry means the tile has no hint.
 */
@Component({
  selector: 'app-skeleton-facts',
  imports: [FactTileComponent, SkeletonBlockComponent],
  host: { 'aria-hidden': 'true', '[class.summary]': 'summary()' },
  template: `
    @for (label of labels(); track $index; let first = $first; let last = $last) {
      <app-fact-tile
        [class.wide]="first && wideFirst()"
        [class.stone]="stoneAll() || (last && stoneLast())"
        [label]="label || blank"
        [surface]="stoneAll() || (last && stoneLast()) ? 'stone' : 'paper'"
        [hint]="hints()[$index] ?? ''"
        [hintPending]="hints()[$index] === null"
      >
        <app-skeleton-block width="80%" height="1em" />
        <app-skeleton-block factHint width="60%" height="1.225rem" />
      </app-fact-tile>
    }
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--quipu-franja);
    }
    :host(.summary) app-fact-tile {
      --quipu-cifra-ficha: var(--quipu-cifra-resumen);
      --quipu-cifra-ficha-movil: var(--quipu-cifra-resumen-movil);
    }
    app-fact-tile {
      --quipu-skeleton-fondo: var(--quipu-piedra-oscura);
      min-width: 0;
    }
    .stone {
      --quipu-skeleton-fondo: var(--quipu-alpaca);
    }
    .wide {
      grid-column: var(--skeleton-wide-column, 1 / -1);
    }
  `,
})
export class SkeletonFactsComponent {
  /** The label of a tile whose name depends on the data keeps the height of its line. */
  protected readonly blank = String.fromCharCode(160);
  readonly labels = input.required<readonly string[]>();
  readonly wideFirst = input(true);
  /** The last tile is on dark stone, as «Neto del mes» is. */
  readonly stoneLast = input(false);
  /** Every tile is on dark stone. */
  readonly stoneAll = input(false);
  /** The figures are the size of a summary beside a form; `false` is the size of a balance. */
  readonly summary = input(true);
  readonly hints = input<readonly (string | null)[]>([]);
}
