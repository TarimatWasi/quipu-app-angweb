import { Component, input, output } from '@angular/core';

let nextId = 0;

/**
 * P-12 Vacío: a centered block of paper that says what is happening (the heading) and what to do
 * (the projected text). An `[emptyAction]` element goes under the text («Volver a Huéspedes»).
 * With `filtered`, it is the «Ningún … coincide» of a filter without results and offers «Quitar
 * filtros», which emits `clearFilters`.
 */
@Component({
  selector: 'app-empty-state',
  template: `
    <section [attr.aria-labelledby]="headingId">
      <h2 [id]="headingId">{{ heading() }}</h2>
      <p class="text"><ng-content /></p>
      <div class="action"><ng-content select="[emptyAction]" /></div>
      @if (filtered()) {
        <button
          class="quipu-button quipu-button--secondary"
          type="button"
          (click)="clearFilters.emit()"
        >
          Quitar filtros
        </button>
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    section {
      padding: 3rem 1.5rem;
      border-radius: var(--quipu-radio);
      background: var(--quipu-alpaca);
      text-align: center;
    }
    h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 800;
    }
    .text {
      max-width: 46ch;
      margin: 0.625rem auto 0;
      font-size: 1.0625rem;
      line-height: 1.5;
      color: var(--quipu-tinta-secundaria);
    }
    .text:empty {
      display: none;
    }
    button,
    .action {
      margin-top: 1.25rem;
    }
    .action:empty {
      display: none;
    }
  `,
})
export class EmptyStateComponent {
  /** E.g. «Aún no tienes una estadía registrada» or «Ningún pago coincide». */
  readonly heading = input.required<string>();
  /** A filter left nothing to show: offers «Quitar filtros». */
  readonly filtered = input(false);
  readonly clearFilters = output();

  protected readonly headingId = `empty-state-${String(nextId++)}`;
}
