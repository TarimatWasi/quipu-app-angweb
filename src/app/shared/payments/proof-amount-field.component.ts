import { Component, input, output } from '@angular/core';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';
import { FieldControlDirective } from '@shared/ui/form-field/field-control.directive';

/** Keeps the raw amount while editing; parsing and validation belong to the draft owner. */
@Component({
  selector: 'app-proof-amount-field',
  imports: [FormFieldComponent, FieldControlDirective],
  template: `
    <app-form-field
      [fieldId]="fieldId()"
      [label]="label()"
      [money]="true"
      [error]="error()"
      [help]="help()"
    >
      <input
        appFieldControl
        class="quipu-input"
        type="text"
        inputmode="decimal"
        aria-required="true"
        [value]="value()"
        (input)="valueChange.emit($event.target.value)"
      />
    </app-form-field>
  `,
  styles: ':host { display: block; }',
})
export class ProofAmountFieldComponent {
  readonly fieldId = input.required<string>();
  readonly label = input('Monto (S/)');
  readonly value = input.required<string>();
  readonly error = input<string | null>(null);
  readonly help = input<string | null>(null);
  readonly valueChange = output<string>();
}
