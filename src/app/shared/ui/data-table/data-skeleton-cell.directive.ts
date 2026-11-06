import { Directive, inject, input, TemplateRef } from '@angular/core';

/** Optional loading layout for a column that needs more than one block. */
@Directive({ selector: 'ng-template[appDataSkeletonCell]' })
export class DataSkeletonCellDirective {
  readonly appDataSkeletonCell = input.required<string>();
  readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}
