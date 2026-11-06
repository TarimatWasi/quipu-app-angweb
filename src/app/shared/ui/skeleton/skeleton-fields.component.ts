import { Component, input } from '@angular/core';
import { SkeletonBlockComponent } from './skeleton-block.component';

/** Decorative fields; the enclosing skeleton owns timing and the accessible loading region. */
@Component({
  selector: 'app-skeleton-fields',
  imports: [SkeletonBlockComponent],
  host: { 'aria-hidden': 'true' },
  template: `
    @for (label of labels(); track $index) {
      <div class="quipu-field">
        <span class="quipu-label">{{ label }}</span>
        <app-skeleton-block shape="rectangle" />
      </div>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: 1.375rem;
    }
  `,
})
export class SkeletonFieldsComponent {
  readonly labels = input.required<readonly string[]>();
}
