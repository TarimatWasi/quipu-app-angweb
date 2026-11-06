import { Directive, inject, TemplateRef } from '@angular/core';

/** Custom layout mounted only after the common loading delay. */
@Directive({ selector: 'ng-template[appSkeletonContent]' })
export class SkeletonContentDirective {
  readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}
