import { Component, input, model, output } from '@angular/core';
import type { PhoneSort } from '../data-table/list-sort';
import { SearchFieldComponent } from '../search-field/search-field.component';

/**
 * The filters of a list (A3, A5): «Buscar», the screen's own selects (projected), «Ordenar por» on
 * a phone, and «Mostrando N de M» with «Quitar filtros» when something narrows the list. The
 * screen keeps the filters and the order; this only shows and reports them.
 */
@Component({
  selector: 'app-list-filters',
  imports: [SearchFieldComponent],
  template: `
    <div class="quipu-filters">
      @if (searchable()) {
        <app-search-field
          class="quipu-search"
          [fieldId]="idPrefix() + '-search'"
          [placeholder]="placeholder()"
          [(value)]="search"
        />
      }
      <ng-content />
      @if (phoneSorts().length > 0) {
        <div class="quipu-field quipu-only-narrow">
          <label class="quipu-label" [for]="idPrefix() + '-sort'">Ordenar por</label>
          <select
            class="quipu-input quipu-input--filter"
            [id]="idPrefix() + '-sort'"
            (change)="sorted($event.target)"
          >
            @for (option of phoneSorts(); track option.key) {
              <option [value]="option.key" [selected]="option.key === sortKey()">
                {{ option.label }}
              </option>
            }
          </select>
        </div>
      }
      <p class="quipu-list-count">
        <output aria-live="polite">{{ count() }}</output>
        @if (filtered()) {
          <span aria-hidden="true"> · </span>
          <button class="quipu-button quipu-button--tertiary" type="button" (click)="clear.emit()">
            Quitar filtros
          </button>
        }
      </p>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class ListFiltersComponent {
  /** Prefix of the ids of its fields, unique in the page («payments» → «payments-search»). */
  readonly idPrefix = input.required<string>();
  readonly placeholder = input('');
  /** Whether «Buscar» is offered: a list whose rows have no name to look for (H4) leaves it out. */
  readonly searchable = input(true);
  readonly search = model('');
  /** «Mostrando 4 de 4» or «Mostrando 20 de 20 cargados». */
  readonly count = input.required<string>();
  /** Something narrows the list: «Quitar filtros» is offered. */
  readonly filtered = input(false);
  readonly phoneSorts = input<readonly PhoneSort[]>([]);
  readonly sortKey = input<string | null>(null);
  /** «Quitar filtros» was pressed. */
  readonly clear = output();
  /** An order was chosen in «Ordenar por» (always ascending, as its labels say). */
  readonly phoneSort = output<string>();

  protected sorted(target: EventTarget | null): void {
    if (target instanceof HTMLSelectElement) this.phoneSort.emit(target.value);
  }
}
