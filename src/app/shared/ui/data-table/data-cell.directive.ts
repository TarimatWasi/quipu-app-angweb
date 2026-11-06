import { Directive, inject, input, TemplateRef } from '@angular/core';

/** What a cell, a card or the footer of `app-data-table` receives: the row it shows. */
export interface DataRowContext<T> {
  readonly $implicit: T;
  readonly index: number;
}

/**
 * The content of one column of `app-data-table`, by its key:
 * `<ng-template appDataCell="guest" [appDataCellRows]="rows()" let-row>…</ng-template>`.
 * `appDataCellRows` only types `row` in the template; the table brings the rows.
 */
@Directive({ selector: 'ng-template[appDataCell]' })
export class DataCellDirective<T> {
  readonly appDataCell = input.required<string>();
  readonly appDataCellRows = input<readonly T[]>([]);
  readonly template = inject<TemplateRef<DataRowContext<T>>>(TemplateRef);

  static ngTemplateContextGuard<T>(
    directive: DataCellDirective<T>,
    context: unknown,
  ): context is DataRowContext<T> {
    // Only for the type of `let-row` in the template: Angular never calls it at run time.
    return directive instanceof DataCellDirective && typeof context === 'object';
  }
}
