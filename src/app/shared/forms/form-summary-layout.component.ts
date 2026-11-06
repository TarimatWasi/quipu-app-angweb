import { Component } from '@angular/core';

/** Projects the existing form and summary without changing their DOM, semantics or focus order. */
@Component({
  selector: 'app-form-summary-layout',
  template: '<ng-content />',
  styles: `
    :host {
      display: grid;
      gap: 40px 56px;
      margin-top: 32px;
      align-items: start;
      grid-template-columns: minmax(0, 1.4fr) minmax(320px, 1fr);
    }
    @media (max-width: 900px) {
      :host {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class FormSummaryLayoutComponent {}
