import { Component, input } from '@angular/core';

/** The five states of the Estándar UI (§3.2); each screen maps its own labels onto one of them. */
export type StatusTone = 'paid' | 'review' | 'unpaid' | 'overdue' | 'rejected';

/**
 * P-08 Insignia de estado: an 8 px dot and the label in bold on the background of its state.
 * The label always says the state in words, so the color is never the only cue.
 */
@Component({
  selector: 'app-status-badge',
  template: `<span class="dot" aria-hidden="true"></span>{{ label() }}`,
  host: { '[class]': '"tone-" + tone()' },
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0.75rem;
      border-radius: 4px;
      font-size: 0.9375rem;
      font-weight: 700;
      line-height: 1.2;
      white-space: nowrap;
    }
    .dot {
      flex: none;
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    :host(.tone-paid) {
      background: var(--quipu-estado-pagado-fondo);
      color: var(--quipu-estado-pagado-texto);
      --dot: var(--quipu-estado-pagado-punto);
    }
    :host(.tone-review) {
      background: var(--quipu-estado-revision-fondo);
      color: var(--quipu-estado-revision-texto);
      --dot: var(--quipu-estado-revision-punto);
    }
    :host(.tone-unpaid) {
      background: var(--quipu-estado-no-pagado-fondo);
      color: var(--quipu-estado-no-pagado-texto);
      --dot: var(--quipu-estado-no-pagado-punto);
    }
    :host(.tone-overdue) {
      background: var(--quipu-estado-atrasado-fondo);
      color: var(--quipu-estado-atrasado-texto);
      --dot: var(--quipu-estado-atrasado-punto);
    }
    :host(.tone-rejected) {
      background: var(--quipu-estado-rechazado-fondo);
      color: var(--quipu-estado-rechazado-texto);
      --dot: var(--quipu-estado-rechazado-punto);
    }
    .dot {
      background: var(--dot);
    }
  `,
})
export class StatusBadgeComponent {
  readonly tone = input.required<StatusTone>();
  readonly label = input.required<string>();
}
