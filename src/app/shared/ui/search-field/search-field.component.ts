import { Component, input, model } from '@angular/core';

/**
 * «Buscar» with its magnifier (A3, A5, A5.1): a labelled search field of the kit. The value is a
 * model, so a screen binds it with `[(value)]` and filters what it has loaded.
 */
@Component({
  selector: 'app-search-field',
  template: `
    <div class="quipu-field">
      <label class="quipu-label" [for]="fieldId()">{{ label() }}</label>
      <div class="quipu-search-box">
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          class="quipu-input"
          type="search"
          autocomplete="off"
          [class.quipu-input--filter]="onPage()"
          [id]="fieldId()"
          [placeholder]="placeholder()"
          [value]="value()"
          [attr.aria-controls]="controls()"
          [attr.aria-describedby]="describedBy()"
          [attr.aria-invalid]="invalid() ? 'true' : null"
          [attr.aria-required]="required() ? 'true' : null"
          (input)="typed($event.target)"
        />
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class SearchFieldComponent {
  readonly fieldId = input.required<string>();
  readonly label = input('Buscar');
  readonly placeholder = input('');
  /** On the stone of the page (a list filter) rather than on paper (a form). */
  readonly onPage = input(true);
  readonly controls = input<string | null>(null);
  readonly describedBy = input<string | null>(null);
  readonly invalid = input(false);
  readonly required = input(false);
  readonly value = model('');

  protected typed(target: EventTarget | null): void {
    this.value.set(target instanceof HTMLInputElement ? target.value : '');
  }
}
