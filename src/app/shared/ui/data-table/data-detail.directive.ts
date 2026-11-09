import { Directive, inject, input, TemplateRef } from '@angular/core';
import type { DataRowContext } from './data-cell.directive';

/**
 * P-24 Fila desplegable: what a row shows under it when it is open, across all its columns:
 * `<ng-template appDataDetail [appDataDetailRows]="rows()" let-row>…</ng-template>`. Which rows are
 * open is the screen's (`openRows` of the table, {@link OpenRows}); the table only draws the detail.
 * A phone has no table, so its card draws its own detail.
 */
@Directive({ selector: 'ng-template[appDataDetail]' })
export class DataDetailDirective<T> {
  readonly appDataDetailRows = input<readonly T[]>([]);
  readonly template = inject<TemplateRef<DataRowContext<T>>>(TemplateRef);

  static ngTemplateContextGuard<T>(
    directive: DataDetailDirective<T>,
    context: unknown,
  ): context is DataRowContext<T> {
    // Only for the type of `let-row` in the template: Angular never calls it at run time.
    return directive instanceof DataDetailDirective && typeof context === 'object';
  }
}
