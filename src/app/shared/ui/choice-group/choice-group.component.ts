import { Component, input, output } from '@angular/core';

export interface ChoiceOption<T extends string = string> {
  readonly value: T;
  readonly label: string;
}

/**
 * The buttons of a segmented control (kit `.quipu-segmented`): one is pressed, a press chooses
 * another. Presentation only; the screen owns the value and its validation. Put it inside an
 * `app-form-field` with `[group]="true"`, which names the set.
 */
@Component({
  selector: 'app-choice-group',
  template: `
    <div class="quipu-segmented">
      @for (option of options(); track option.value) {
        <button
          type="button"
          [attr.aria-pressed]="option.value === value()"
          [disabled]="disabled()"
          (click)="valueChange.emit(option.value)"
        >
          {{ option.label }}
        </button>
      }
    </div>
  `,
  styles: ':host { display: block; }',
})
export class ChoiceGroupComponent {
  readonly options = input.required<readonly ChoiceOption[]>();
  readonly value = input<string | null>(null);
  readonly disabled = input(false);
  readonly valueChange = output<string>();
}
