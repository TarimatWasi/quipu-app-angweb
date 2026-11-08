import { Component, computed, input } from '@angular/core';
import { FormSummaryLayoutComponent } from '@shared/forms/form-summary-layout.component';
import { StepListComponent } from '@shared/ui/step-list/step-list.component';
import type { Step } from '@shared/ui/step-list/step-list.component';
import { LEAVE_NOTE, STEP_TEXTS, STEPS_LABEL, STEPS_TITLE, stepCounter } from '../model/onboarding';
import type { OnboardingStep } from '../model/onboarding';

/**
 * The frame of O1, O2 and O3 «Tu registro» (P-25 Pasos al lado): the counter, the title and the
 * intro of the step, the step itself where the page projects it and, beside it, the four steps of
 * the registration; on a phone they become a row of bars above. The frame is the same while the
 * step loads, so only the step's own data is a skeleton (QP-UI-19). No menu: until the registration
 * ends there are no other screens.
 */
@Component({
  selector: 'app-onboarding-frame',
  imports: [FormSummaryLayoutComponent, StepListComponent],
  template: `
    <p class="counter">{{ counter() }}</p>
    <h1>{{ texts().title }}</h1>
    <p class="intro">{{ texts().intro }}</p>
    <app-step-list class="bar" variant="bar" [label]="stepsLabel" [steps]="steps()" />
    <app-form-summary-layout>
      <div class="step"><ng-content /></div>
      <aside class="side" aria-labelledby="registration-steps-title">
        <h2 id="registration-steps-title">{{ stepsTitle }}</h2>
        <app-step-list [label]="stepsLabel" [steps]="steps()" />
        <p class="note">{{ note() }}</p>
      </aside>
    </app-form-summary-layout>
  `,
  styles: `
    :host {
      display: block;
    }
    .counter {
      margin: 0;
      font-weight: var(--quipu-peso-enfasis);
      color: var(--quipu-tinta-secundaria);
    }
    h1 {
      margin: 0.375rem 0 0;
    }
    .intro {
      max-width: 40rem;
      margin: 0.75rem 0 0;
      font: var(--mat-sys-body-large);
      color: var(--quipu-tinta-secundaria);
    }
    .bar {
      display: none;
      margin-top: 1.25rem;
    }
    .step {
      min-width: 0;
    }
    .side {
      display: grid;
      gap: 0.875rem;
      min-width: 0;
    }
    .side h2,
    .note {
      margin: 0;
    }
    .note {
      font: var(--mat-sys-body-medium);
      color: var(--quipu-tinta-secundaria);
    }
    @media (max-width: 900px) {
      .bar {
        display: block;
      }
      .side {
        display: none;
      }
    }
  `,
})
export class OnboardingFrameComponent {
  readonly step = input.required<OnboardingStep>();
  readonly steps = input.required<readonly Step[]>();
  /** What goes under the steps, beside the step; the last step says where the guest goes next. */
  readonly note = input(LEAVE_NOTE);

  protected readonly stepsLabel = STEPS_LABEL;
  protected readonly stepsTitle = STEPS_TITLE;
  protected readonly texts = computed(() => STEP_TEXTS[this.step()]);
  protected readonly counter = computed(() => stepCounter(this.step()));
}
