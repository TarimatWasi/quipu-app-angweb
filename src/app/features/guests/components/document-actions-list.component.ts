import { Component, input } from '@angular/core';
import { NO_ACTIONS_TEXT } from '../model/documents';
import type { ActionRow } from '../model/documents';

/**
 * A3.8 «Borrados y reemplazos» (RF-21, CU-29): the evidence of who deleted or replaced a document,
 * when and why, newest first. It never shows the name or the content of the file (RN-37).
 */
@Component({
  selector: 'app-document-actions-list',
  template: `
    <section aria-labelledby="actions-title">
      <h2 id="actions-title">Borrados y reemplazos</h2>
      @if (rows().length > 0) {
        <ul class="quipu-card-list">
          @for (row of rows(); track row.id) {
            <li class="quipu-card">
              <div class="head">
                <strong>{{ row.title }}</strong>
                <span class="when">{{ row.when }}</span>
              </div>
              <p class="detail">{{ row.detail }}</p>
            </li>
          }
        </ul>
      } @else {
        <p class="quipu-card empty">{{ empty }}</p>
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    h2 {
      margin: 0 0 0.875rem;
    }
    .head {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 0.25rem 1rem;
    }
    .when,
    .detail {
      font: var(--mat-sys-body-medium);
      color: var(--quipu-tinta-secundaria);
    }
    .when {
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class DocumentActionsListComponent {
  readonly rows = input.required<readonly ActionRow[]>();
  protected readonly empty = NO_ACTIONS_TEXT;
}
