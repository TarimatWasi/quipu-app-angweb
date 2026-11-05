import { Component, computed, input, signal } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { firstError } from './form-feedback';

/**
 * The field where a person chooses a password (A0.1, A0.2, A0.4, A0.5), as in the canvas board
 * «Ingreso»: label on top, «Mostrar» / «Ocultar» inside the field (decided 2026-11-01), the error
 * under it and the help «Mínimo 8 caracteres.» linked with aria-describedby. The rules stay with the
 * form (newPasswordRules); this only draws the field with the P-07 classes of styles.scss.
 */
@Component({
  selector: 'app-new-password-field',
  imports: [FormField],
  template: `
    <div class="quipu-field">
      <label class="quipu-label" [for]="inputId()">{{ label() }}</label>
      <div class="quipu-reveal">
        <input
          class="quipu-input"
          [id]="inputId()"
          [type]="revealed() ? 'text' : 'password'"
          autocomplete="new-password"
          aria-required="true"
          [formField]="field()"
          [attr.aria-invalid]="error() ? 'true' : null"
          [attr.aria-describedby]="describedBy()"
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
      @if (error(); as message) {
        <p [id]="inputId() + '-error'" class="quipu-field-error">{{ message }}</p>
      }
      <p [id]="inputId() + '-help'" class="quipu-field-help">Mínimo 8 caracteres.</p>
    </div>
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
  protected readonly describedBy = computed(() => {
    const id = this.inputId();
    return this.error() ? `${id}-error ${id}-help` : `${id}-help`;
  });
}
