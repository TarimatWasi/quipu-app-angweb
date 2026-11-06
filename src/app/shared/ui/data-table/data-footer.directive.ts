import { Directive, inject, TemplateRef } from '@angular/core';

/** The cells of the last row of the table, such as the totals of A5.2: `<ng-template appDataFooter>`. */
@Directive({ selector: 'ng-template[appDataFooter]' })
export class DataFooterDirective {
  readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}
