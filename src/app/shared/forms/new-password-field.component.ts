import { Component, computed, input, signal } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { FieldControlDirective } from '@shared/ui/form-field/field-control.directive';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';
import { firstError } from './form-feedback';

/**
 * The field where a person chooses a password (A0.1, A0.2, A0.4, A0.5), as in the canvas board
 * «Ingreso»: label on top, «Mostrar» / «Ocultar» inside the field (decided 2026-11-01), the error
 * under it and the help «Mínimo 8 caracteres.» linked with aria-describedby. The rules stay with the
 * form (newPasswordRules); this only draws the field with the P-07 classes of styles.scss.
 */
@Component({
  selector: 'app-new-password-field',
  imports: [FieldControlDirective, FormField, FormFieldComponent],
  template: `
    <app-form-field [fieldId]="inputId()" [label]="label()" [error]="error()" [help]="help">
      <div class="quipu-reveal">
        <input
          appFieldControl
          class="quipu-input"
          autocomplete="new-password"
          aria-required="true"
          [type]="revealed() ? 'text' : 'password'"
          [formField]="field()"
        />
        <button
          class="quipu-reveal-toggle"
          type="button"
          [attr.aria-controls]="inputId()"
          [attr.aria-pressed]="revealed()"
          (click)="revealed.set(!revealed())"
        >
          {{ revealed() ? 'Ocultar' : 'Mostrar' }}
        </button>
      </div>
    </app-form-field>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class NewPasswordFieldComponent {
  readonly field = input.required<FieldTree<string>>();
  readonly label = input('Nueva contraseña');
  readonly inputId = input('new-password');

  protected readonly revealed = signal(false);
  protected readonly error = computed(() => firstError(this.field()));
  protected readonly help = 'Mínimo 8 caracteres.';
}
