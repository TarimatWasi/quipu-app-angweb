import { Directive, inject, TemplateRef } from '@angular/core';

/** Mobile loading layout, without a fake business row or interactive controls. */
@Directive({ selector: 'ng-template[appDataSkeletonCard]' })
export class DataSkeletonCardDirective {
  readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}
