import { Component, input, output } from '@angular/core';
import { NowPanelComponent } from '@shared/ui/now-panel/now-panel.component';
import type { NowContent, Pending } from '../model/dashboard-pending';
import { PendingLinkComponent } from './pending-link.component';

/**
 * A1 «Lo que toca ahora»: one figure and one action, and under it «También pendiente», what else
 * waits, each with its link. The tone of a row is told by its dot and its words, never by color alone.
 */
@Component({
  selector: 'app-dashboard-now',
  imports: [NowPanelComponent, PendingLinkComponent],
  template: `
    <app-now-panel
      headingId="dashboard-now-title"
      [figure]="now().figure"
      [label]="now().label"
      [text]="now().meta"
      [urgent]="now().urgent"
    >
      @if (now().cta; as cta) {
        <app-pending-link [link]="cta" [primary]="true" (overdue)="showOverdue.emit()" />
      }
    </app-now-panel>
    @if (also().length > 0) {
      <h3 id="dashboard-also-title">También pendiente</h3>
      <ul aria-labelledby="dashboard-also-title">
        @for (item of also(); track item.key) {
          <li [class]="'tone-' + item.tone">
            <span class="what">
              <span class="dot" aria-hidden="true"></span>
              <span
                ><strong>{{ item.head }}</strong> {{ item.text }}</span
              >
            </span>
            @if (item.link; as link) {
              <app-pending-link [link]="link" (overdue)="showOverdue.emit()" />
            }
          </li>
        }
      </ul>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    h3 {
      margin: 1.25rem 0 0.5rem;
      font: var(--mat-sys-title-small);
      color: var(--quipu-tinta-secundaria);
    }
    ul {
      display: grid;
      gap: var(--quipu-franja);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    li {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.375rem 1rem;
      padding: 0.75rem 1.125rem;
      border-radius: var(--quipu-radio);
      background: var(--tone-fondo);
      color: var(--tone-texto);
      line-height: 1.45;
    }
    .what {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 0;
    }
    .dot {
      flex: none;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--tone-punto);
    }
    .tone-danger {
      --tone-fondo: var(--quipu-rojo-fondo);
      --tone-texto: var(--quipu-rojo-texto);
      --tone-punto: var(--quipu-estado-atrasado-punto);
    }
    .tone-warning {
      --tone-fondo: var(--quipu-amarillo-fondo);
      --tone-texto: var(--quipu-amarillo-texto);
      --tone-punto: var(--quipu-estado-revision-punto);
    }
    .tone-neutral {
      --tone-fondo: var(--quipu-piedra-oscura);
      --tone-texto: var(--quipu-tinta);
      --tone-punto: var(--quipu-gris-punto);
    }
    app-pending-link {
      color: inherit;
    }
    @media (max-width: 599.98px) {
      li {
        padding: 0.75rem 0.875rem;
        font-size: 0.9375rem;
      }
    }
  `,
})
export class DashboardNowComponent {
  readonly now = input.required<NowContent>();
  readonly also = input.required<readonly Pending[]>();
  /** «Ver atrasados» was pressed: the page turns the table to Atrasado. */
  readonly showOverdue = output();
}
