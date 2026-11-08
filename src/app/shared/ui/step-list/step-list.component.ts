import { Component, input } from '@angular/core';

/** One step of a process the person goes through, done or still missing. */
export interface Step {
  readonly label: string;
  readonly done: boolean;
  /** A pending step that can be skipped says «Falta · opcional» (or «Ahora · opcional»). */
  readonly optional: boolean;
  /** The step the person is on: «Ahora», marked as the current one. */
  readonly current?: boolean;
  /** What a done step adds to «Hecho», e.g. «2 archivos». */
  readonly detail?: string;
}

/** The state of a step in words: «Hecho · 2 archivos», «Ahora · opcional», «Falta». */
export function stepState(step: Step): string {
  if (step.done) return step.detail ? `Hecho · ${step.detail}` : 'Hecho';
  const state = step.current ? 'Ahora' : 'Falta';
  return step.optional ? `${state} · opcional` : state;
}

/**
 * P-25 Lista de pasos: each step in its own alpaca row, with a green check and «Hecho» once done,
 * or an empty circle and «Falta» (or «Falta · opcional»); the step the person is on says «Ahora» and
 * is marked as the current one. The state is always in words; the marks are hidden from screen
 * readers. `bar` is the same list as a row of bars with the name under each, for a phone.
 */
@Component({
  selector: 'app-step-list',
  template: `
    <ol [attr.aria-label]="label()" [class.bar]="variant() === 'bar'">
      @for (step of steps(); track step.label) {
        <li
          [class.done]="step.done"
          [class.current]="step.current"
          [attr.aria-current]="step.current ? 'step' : null"
        >
          <span class="bar-fill" aria-hidden="true"></span>
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
          <span class="state">{{ stateOf(step) }}</span>
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
    .current {
      background: var(--quipu-piedra-oscura);
    }
    .current .mark {
      border-color: var(--quipu-qolle);
      background: var(--quipu-qolle);
    }
    .current .state {
      color: var(--quipu-tinta);
      font-weight: var(--quipu-peso-enfasis);
    }
    .bar-fill {
      display: none;
    }
    .bar {
      grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
      grid-auto-flow: column;
      gap: 3px;
    }
    .bar li {
      display: grid;
      align-content: start;
      gap: 0.375rem;
      padding: 0;
      background: none;
    }
    .bar .bar-fill {
      display: block;
      height: 0.5rem;
      border-radius: 2px;
      background: var(--quipu-piedra-oscura);
    }
    .bar .done .bar-fill {
      background: var(--quipu-chilca);
    }
    .bar .current .bar-fill {
      background: var(--quipu-qolle);
    }
    .bar .mark,
    .bar .state {
      /* The bar says the state in words for screen readers only; the name is what a phone shows. */
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
    }
    .bar .name {
      font: var(--mat-sys-body-small);
      line-height: 1.2;
    }
  `,
})
export class StepListComponent {
  readonly steps = input.required<readonly Step[]>();
  /** The accessible name of the list, e.g. «Pasos de su registro». */
  readonly label = input.required<string>();
  readonly variant = input<'list' | 'bar'>('list');

  protected readonly stateOf = stepState;
}
