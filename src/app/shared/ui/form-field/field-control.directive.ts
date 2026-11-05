import { Directive, inject } from '@angular/core';
import { FormFieldComponent } from './form-field.component';

/**
 * The control of an `app-form-field` (an input, a select, a textarea or the buttons of a group):
 * it takes the id of the field and says whether it is invalid and what describes it, so the screen
 * never wires `aria-invalid` and `aria-describedby` by hand.
 */
@Directive({
  selector: '[appFieldControl]',
  host: {
    '[attr.id]': 'field.group() ? null : field.fieldId()',
    '[attr.aria-invalid]': 'field.error() ? "true" : null',
    '[attr.aria-describedby]': 'field.describedBy()',
  },
})
export class FieldControlDirective {
  protected readonly field = inject(FormFieldComponent);
}
