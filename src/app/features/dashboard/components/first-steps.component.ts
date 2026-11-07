import { Component, input } from '@angular/core';
import type { FirstStep } from '../model/dashboard-pending';
import { PendingLinkComponent } from './pending-link.component';

/** «Para empezar» (first use): the three steps of a new residence, each with its way in. */
@Component({
  selector: 'app-first-steps',
  imports: [PendingLinkComponent],
  template: `
    <ol aria-label="Para empezar">
      @for (step of steps(); track step.title; let index = $index) {
        <li>
          <span class="what">
            <span class="number" aria-hidden="true">{{ index + 1 }}</span>
            <span>
              <strong>{{ step.title }}</strong>
              <span class="text">{{ step.text }}</span>
            </span>
          </span>
          @if (step.link; as link) {
            <app-pending-link [link]="link" />
          }
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
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem 1rem;
      padding: var(--quipu-relleno-tarjeta);
      border-radius: var(--quipu-radio);
      background: var(--quipu-alpaca);
    }
    .what {
      display: flex;
      align-items: center;
      gap: 0.875rem;
    }
    .number {
      display: grid;
      flex: none;
      place-items: center;
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      background: var(--quipu-piedra-oscura);
      font: var(--mat-sys-title-small);
    }
    strong,
    .text {
      display: block;
    }
    .text {
      font: var(--mat-sys-body-medium);
      color: var(--quipu-tinta-secundaria);
    }
  `,
})
export class FirstStepsComponent {
  readonly steps = input.required<readonly FirstStep[]>();
}
