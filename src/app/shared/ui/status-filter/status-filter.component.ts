import { Component, computed, Directive, input, output } from '@angular/core';
import type { StatusTone } from '@shared/ui/status-badge/status-badge.component';

/** One state present in a list: its key, its label in words, how many items and its tone. */
export interface StatusSegment {
  readonly key: string;
  readonly label: string;
  readonly count: number;
  readonly tone: StatusTone;
}

/**
 * The share of the bar a segment takes, as its flex-grow: a proportion that comes from the data,
 * so it is bound on the host instead of written in the template or the stylesheet.
 */
@Directive({ selector: '[appBarShare]', host: { '[style.flex-grow]': 'appBarShare()' } })
export class BarShareDirective {
  readonly appBarShare = input.required<number>();
}

/**
 * P-05 Barra de estados and P-06 Filtro por estado: a bar split in proportion to how many items
 * each state has, and a tile per state with its figure in Fraunces (40 px, 30 on a phone) after
 * «Todos». A segment or a tile pressed filters by its state (`chosen` emits its key; «Todos»
 * emits null); the one in force goes in obsidian. The color of the bar is never the only cue:
 * every segment says its state and count to a screen reader, and the tiles say them in words.
 */
@Component({
  selector: 'app-status-filter',
  imports: [BarShareDirective],
  template: `
    <div class="bar" role="group" [attr.aria-label]="barLabel()">
      @for (segment of segments(); track segment.key) {
        <button
          type="button"
          [class]="'segment tone-' + segment.tone"
          [appBarShare]="segment.count"
          [attr.aria-pressed]="selected() === segment.key"
          [attr.aria-label]="'Mostrar solo ' + segment.label + ' (' + segment.count + ')'"
          (click)="choose(segment.key)"
        ></button>
      }
    </div>
    <div class="tiles" role="group" [attr.aria-label]="tilesLabel()">
      <button
        type="button"
        class="tile"
        [attr.aria-pressed]="selected() === null"
        (click)="chosen.emit(null)"
      >
        <span class="label">Todos</span>
        <span class="cdk-visually-hidden">: </span>
        <span class="figure">{{ total() }}</span>
      </button>
      @for (segment of segments(); track segment.key) {
        <button
          type="button"
          [class]="'tile tone-' + segment.tone"
          [attr.aria-pressed]="selected() === segment.key"
          (click)="choose(segment.key)"
        >
          <span class="label">{{ segment.label }}</span>
          <span class="cdk-visually-hidden">: </span>
          <span class="figure">{{ segment.count }}</span>
        </button>
      }
    </div>
  `,
  styles: `
    :host {
      display: grid;
      gap: 0.75rem;
    }
    .bar {
      display: flex;
      gap: var(--quipu-franja);
      height: 0.75rem;
    }
    .segment {
      flex-basis: 0;
      min-width: var(--quipu-toque);
      padding: 0;
      border: 0;
      border-radius: var(--quipu-radio);
      background: var(--segment);
      cursor: pointer;
    }
    .segment[aria-pressed='true'] {
      outline: var(--quipu-borde-ancho-enfasis) solid var(--quipu-obsidiana);
      outline-offset: var(--quipu-borde-ancho-enfasis);
    }
    .tone-paid {
      --segment: var(--quipu-estado-pagado-punto);
    }
    .tone-review {
      --segment: var(--quipu-estado-revision-punto);
    }
    .tone-unpaid {
      --segment: var(--quipu-estado-no-pagado-punto);
    }
    .tone-overdue {
      --segment: var(--quipu-estado-atrasado-punto);
    }
    .tone-rejected {
      --segment: var(--quipu-estado-rechazado-punto);
    }
    .tiles {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
      gap: var(--quipu-franja);
    }
    .tile {
      display: grid;
      gap: 0.5rem;
      justify-items: start;
      padding: var(--quipu-relleno-ficha);
      border: 0;
      border-radius: var(--quipu-radio);
      background: var(--quipu-alpaca);
      color: var(--quipu-tinta);
      text-align: left;
      cursor: pointer;
      transition: background-color var(--quipu-duracion-hover) var(--quipu-ease-hover);
    }
    .tile:hover:not([aria-pressed='true']) {
      background: var(--quipu-hover-fila);
    }
    .label {
      font: var(--mat-sys-label-medium);
      color: var(--quipu-tinta-secundaria);
    }
    .figure {
      font: var(--mat-sys-headline-large);
      font-size: var(--quipu-cifra-ficha);
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }
    .tile.tone-overdue .figure {
      color: var(--quipu-estado-atrasado-texto);
    }
    .tile[aria-pressed='true'] {
      background: var(--quipu-obsidiana);
    }
    .tile[aria-pressed='true'] .label,
    .tile[aria-pressed='true'] .figure {
      color: var(--quipu-alpaca);
    }
    .tile:focus-visible {
      outline-offset: var(--quipu-borde-ancho-enfasis);
    }
    @media (max-width: 599.98px) {
      .tiles {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .tile {
        padding: var(--quipu-relleno-ficha-movil);
      }
      .figure {
        font-size: var(--quipu-cifra-ficha-movil);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .tile {
        transition: none;
      }
    }
  `,
})
export class StatusFilterComponent {
  readonly segments = input.required<readonly StatusSegment[]>();
  /** The key in force; null shows them all. */
  readonly selected = input<string | null>(null);
  /** What the items are, for the names of the groups: «meses». */
  readonly noun = input.required<string>();
  /** The key of a state, or null for «Todos». A state already in force goes back to «Todos». */
  readonly chosen = output<string | null>();

  protected readonly total = computed(() =>
    this.segments().reduce((sum, segment) => sum + segment.count, 0),
  );
  protected readonly barLabel = computed(() => `Estados de los ${this.noun()}`);
  protected readonly tilesLabel = computed(() => `Filtrar ${this.noun()} por estado`);

  protected choose(key: string): void {
    this.chosen.emit(this.selected() === key ? null : key);
  }
}
