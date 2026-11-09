import { Component, input, output } from '@angular/core';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';
import { FieldControlDirective } from '@shared/ui/form-field/field-control.directive';
import { PAYMENT_METHOD_SHORTCUTS } from './proof-rules';

/** «Medio de pago (opcional)» with its shortcuts; the same words in A5.1, A5.2, H3 and T2 (D-92). */
@Component({
  selector: 'app-proof-method-field',
  imports: [FormFieldComponent, FieldControlDirective],
  template: `
    <app-form-field [fieldId]="fieldId()" label="Medio de pago (opcional)">
      <input
        appFieldControl
        class="quipu-input"
        type="text"
        maxlength="60"
        placeholder="Por ejemplo, Yape"
        [value]="value()"
        (input)="valueChange.emit($event.target.value)"
      />
      <div class="quipu-segmented" role="group" aria-label="Elegir un medio de pago">
        @for (shortcut of shortcuts; track shortcut) {
          <button
            type="button"
            [attr.aria-pressed]="value() === shortcut"
            (click)="valueChange.emit(shortcut)"
          >
            {{ shortcut }}
          </button>
        }
      </div>
    </app-form-field>
  `,
  styles: ':host { display: block; }',
})
export class ProofMethodFieldComponent {
  readonly fieldId = input.required<string>();
  readonly value = input.required<string>();
  readonly valueChange = output<string>();
  protected readonly shortcuts = PAYMENT_METHOD_SHORTCUTS;
}
