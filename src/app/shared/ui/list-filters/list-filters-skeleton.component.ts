import { Component, input } from '@angular/core';
import { SkeletonBlockComponent } from '../skeleton/skeleton-block.component';

/**
 * What a list shows while it loads, in the shape of its real controls: the views, «Buscar», one
 * block per select, «Ordenar por» on a phone and the count. The screen names the views and the
 * selects it will have (the same ones, so nothing moves when the list arrives). Decorative: the
 * loading region around it owns the announcements.
 */
@Component({
  selector: 'app-list-filters-skeleton',
  imports: [SkeletonBlockComponent],
  template: `
    <div class="quipu-segmented quipu-segmented--fill views">
      @for (label of views(); track label) {
        <button type="button" disabled>{{ label }}</button>
      }
    </div>
    <div class="quipu-filters">
      @if (search()) {
        <div class="quipu-field quipu-search">
          <span class="quipu-label">Buscar</span><app-skeleton-block shape="rectangle" />
        </div>
      }
      @for (label of fields(); track label) {
        <div class="quipu-field">
          <span class="quipu-label">{{ label }}</span
          ><app-skeleton-block shape="rectangle" />
        </div>
      }
      @if (phoneSort()) {
        <div class="quipu-field quipu-only-narrow">
          <span class="quipu-label">Ordenar por</span><app-skeleton-block shape="rectangle" />
        </div>
      }
      <div class="quipu-list-count"><app-skeleton-block width="8rem" /></div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class ListFiltersSkeletonComponent {
  /** The labels of the views, as the segmented control will show them. */
  readonly views = input.required<readonly string[]>();
  /** The label of each select the list will have beside «Buscar». */
  readonly fields = input<readonly string[]>([]);
  /** The list has «Buscar». */
  readonly search = input(true);
  /** The list offers «Ordenar por» on a phone. */
  readonly phoneSort = input(true);
}
