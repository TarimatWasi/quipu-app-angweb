import { Component, input } from '@angular/core';

/** One step of a process the person goes through, done or still missing. */
export interface Step {
  readonly label: string;
  readonly done: boolean;
  /** A missing step that can be skipped says «Falta · opcional». */
  readonly optional: boolean;
}

/**
 * P-25 Lista de pasos: each step in its own alpaca row, with a green check and «Hecho» once done,
 * or an empty circle and «Falta» (or «Falta · opcional»). The state is always in words; the marks
 * are hidden from screen readers.
 */
@Component({
  selector: 'app-step-list',
  template: `
    <ol [attr.aria-label]="label()">
      @for (step of steps(); track step.label) {
        <li [class.done]="step.done">
          <span class="mark" aria-hidden="true">
            @if (step.done) {
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M5 12l5 5L20 7" />
              </svg>
            }
          </span>
          <span class="name">{{ step.label }}</span>
          <span class="cdk-visually-hidden">: </span>
          <span class="state">{{
            step.done ? 'Hecho' : step.optional ? 'Falta · opcional' : 'Falta'
          }}</span>
        </li>
      }
    </ol>
  `,
  styles: `
    :host {
      display: block;
    }
    ol {
      display: grid;
      gap: var(--quipu-franja);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    li {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: var(--quipu-relleno-tarjeta);
      border-radius: var(--quipu-radio);
      background: var(--quipu-alpaca);
    }
    .mark {
      display: grid;
      flex: none;
      place-items: center;
      width: 1.5rem;
      height: 1.5rem;
      box-sizing: border-box;
      border: var(--quipu-borde-ancho-enfasis) solid var(--quipu-borde);
      border-radius: 50%;
    }
    .done .mark {
      border-color: var(--quipu-chilca);
      background: var(--quipu-chilca);
      color: var(--quipu-alpaca);
    }
    .name {
      flex: 1;
      font-weight: var(--quipu-peso-enfasis);
    }
    .state {
      font: var(--mat-sys-body-small);
      color: var(--quipu-tinta-secundaria);
    }
    .done .state {
      color: var(--quipu-verde-texto);
      font-weight: var(--quipu-peso-enfasis);
    }
  `,
})
export class StepListComponent {
  readonly steps = input.required<readonly Step[]>();
  /** The accessible name of the list, e.g. «Pasos de su registro». */
  readonly label = input.required<string>();
}
