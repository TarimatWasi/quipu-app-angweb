import { Directive, inject, input, TemplateRef } from '@angular/core';
import type { DataRowContext } from './data-cell.directive';

/**
 * One row as a card on a phone: `<ng-template appDataCard [appDataCardRows]="rows()" let-row>`.
 * With it the table shows on a wide screen and the cards on a phone; without it, the table always.
 */
@Directive({ selector: 'ng-template[appDataCard]' })
export class DataCardDirective<T> {
  readonly appDataCardRows = input<readonly T[]>([]);
  readonly template = inject<TemplateRef<DataRowContext<T>>>(TemplateRef);

  static ngTemplateContextGuard<T>(
    directive: DataCardDirective<T>,
    context: unknown,
  ): context is DataRowContext<T> {
    // Only for the type of `let-row` in the template: Angular never calls it at run time.
    return directive instanceof DataCardDirective && typeof context === 'object';
  }
}
