import { Component, computed, input, model } from '@angular/core';

/**
 * A single checkbox on its own row (the consent of the onboarding, O3): a big box and its sentence
 * on a stone row that turns red when the screen reports an error. The error and the help go under
 * it, tied to the input. The screen decides when it is wrong; this only draws and reports `checked`.
 */
@Component({
  selector: 'app-check-field',
  template: `
    <div class="quipu-field">
      <label class="row" [class.invalid]="error() !== null">
        <input
          class="box"
          type="checkbox"
          [id]="fieldId()"
          [checked]="checked()"
          [attr.aria-invalid]="error() ? 'true' : null"
          [attr.aria-describedby]="describedBy()"
          (change)="toggle($event.target)"
        />
        <span class="label">{{ label() }}</span>
      </label>
      @if (error(); as message) {
        <p class="quipu-field-error" [id]="fieldId() + '-error'">{{ message }}</p>
      }
      @if (help(); as text) {
        <p class="quipu-field-help" [id]="fieldId() + '-help'">{{ text }}</p>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .row {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      min-height: 3.25rem;
      padding: 0.625rem 1rem;
      border-radius: var(--quipu-radio);
      background: var(--quipu-piedra-oscura);
      cursor: pointer;
    }
    .row.invalid {
      background: var(--quipu-aviso-error-fondo);
      outline: var(--quipu-borde-ancho-enfasis) solid var(--quipu-error);
    }
    .box {
      flex: none;
      width: 1.5rem;
      height: 1.5rem;
      margin: 0;
      accent-color: var(--quipu-chilca);
      cursor: pointer;
    }
    .label {
      font: var(--mat-sys-body-large);
      font-weight: var(--quipu-peso-enfasis);
    }
  `,
})
export class CheckFieldComponent {
  readonly fieldId = input.required<string>();
  readonly label = input.required<string>();
  readonly help = input<string | null>(null);
  readonly error = input<string | null>(null);
  readonly checked = model(false);

  protected readonly describedBy = computed(() => {
    if (this.error()) return `${this.fieldId()}-error`;
    return this.help() ? `${this.fieldId()}-help` : null;
  });

  protected toggle(target: EventTarget | null): void {
    if (target instanceof HTMLInputElement) this.checked.set(target.checked);
  }
}
