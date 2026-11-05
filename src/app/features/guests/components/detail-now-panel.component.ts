import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StatusBadgeComponent } from '@shared/ui/status-badge/status-badge.component';
import type { DetailPanel, PanelAction } from '../model/detail-panel';

/**
 * A3.2 «Lo que toca ahora» (P-04): the figure, what it counts, its context and at most one primary
 * action. A link goes where it says; «Generar otro acceso» and «Reactivar huésped» are the page's,
 * which `act` asks for.
 */
@Component({
  selector: 'app-detail-now-panel',
  imports: [RouterLink, StatusBadgeComponent],
  template: `
    <section class="quipu-now-panel" aria-labelledby="detail-now-title">
      <h2 id="detail-now-title" class="cdk-visually-hidden">Lo que toca ahora</h2>
      <div class="what">
        <p class="headline">
          <span class="figure" [class.alarm]="panel().alarm">{{ panel().figure }}</span>
          @if (panel().label) {
            <span class="label">{{ panel().label }}</span>
          }
          @if (panel().badge; as badge) {
            <app-status-badge [tone]="badge.tone" [label]="badge.label" />
          }
        </p>
        <p class="text">{{ panel().text }}</p>
      </div>
      @if (panel().action; as action) {
        @if (action.kind === 'link') {
          <a
            class="quipu-button quipu-button--primary"
            [routerLink]="action.link"
            [queryParams]="action.query"
            >{{ action.label }}</a
          >
        } @else {
          <button
            class="quipu-button quipu-button--primary"
            type="button"
            [disabled]="busy()"
            (click)="act.emit(action)"
          >
            {{ action.label }}
          </button>
        }
      }
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
      gap: 0.25rem 0.75rem;
    }
    .figure {
      font: var(--mat-sys-display-medium);
      font-variant-numeric: tabular-nums;
    }
    .figure.alarm {
      color: var(--quipu-estado-atrasado-texto);
    }
    .label {
      font: var(--mat-sys-title-medium);
    }
    app-status-badge {
      align-self: center;
    }
    .text {
      max-width: var(--quipu-texto-medida);
      color: var(--quipu-tinta-secundaria);
    }
    @media (max-width: 599.98px) {
      section {
        grid-template-columns: minmax(0, 1fr);
      }
      .figure {
        font-size: var(--mat-sys-headline-medium-size);
      }
      .quipu-button {
        width: 100%;
      }
    }
  `,
})
export class DetailNowPanelComponent {
  readonly panel = input.required<DetailPanel>();
  /** An action of the page is running: its button waits. */
  readonly busy = input(false);
  /** «Generar otro acceso» or «Reactivar huésped». */
  readonly act = output<PanelAction>();
}
