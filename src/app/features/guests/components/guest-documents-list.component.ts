import { Component, input, output } from '@angular/core';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import {
  DOCUMENTS_TITLE,
  LINK_NOTE,
  NO_DOCUMENTS_TEXT,
  NO_DOCUMENTS_TITLE,
} from '../model/documents';
import type { DocumentRow } from '../model/documents';

/** The press on «Abrir»: the page decides if the link still works before the browser follows it. */
export interface OpenRequest {
  readonly row: DocumentRow;
  readonly event: Event;
}

/**
 * A3.8 «Sus documentos»: each one with its name and what it is, and «Abrir» (a signed link of 15
 * minutes), «Reemplazar» and «Borrar»; or the empty state when the guest uploaded none. It only
 * shows and reports: the page owns the dialogs and the calls.
 */
@Component({
  selector: 'app-guest-documents-list',
  imports: [EmptyStateComponent],
  template: `
    <section aria-labelledby="documents-title">
      <h2 id="documents-title">Sus documentos</h2>
      @if (rows().length > 0) {
        <ul class="quipu-card-list" [attr.aria-label]="title">
          @for (row of rows(); track row.id) {
            <li class="quipu-card item">
              <span class="what">
                <strong>{{ row.name }}</strong>
                <span class="meta">{{ row.meta }}</span>
              </span>
              <span class="actions">
                <a
                  class="quipu-button quipu-button--tertiary"
                  target="_blank"
                  rel="noopener noreferrer"
                  [href]="row.url"
                  (click)="open.emit({ row, event: $event })"
                  >Abrir<span class="cdk-visually-hidden"> {{ row.name }}</span></a
                >
                <button
                  class="quipu-button quipu-button--tertiary"
                  type="button"
                  [disabled]="busy()"
                  (click)="replace.emit(row)"
                >
                  Reemplazar<span class="cdk-visually-hidden"> {{ row.name }}</span>
                </button>
                <button
                  class="quipu-button quipu-button--tertiary"
                  type="button"
                  [disabled]="busy()"
                  (click)="remove.emit(row)"
                >
                  Borrar<span class="cdk-visually-hidden"> {{ row.name }}</span>
                </button>
              </span>
            </li>
          }
        </ul>
        <p class="note">{{ linkNote }}</p>
      } @else {
        <app-empty-state [heading]="emptyTitle">{{ emptyText }}</app-empty-state>
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
    .item {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem 1.25rem;
    }
    .what {
      display: grid;
      flex: 1 1 14rem;
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .meta,
    .note {
      font: var(--mat-sys-body-small);
      color: var(--quipu-tinta-secundaria);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0 1.25rem;
    }
    .note {
      margin: 0.625rem 0 0;
    }
  `,
})
export class GuestDocumentsListComponent {
  readonly rows = input.required<readonly DocumentRow[]>();
  /** An action runs: replacing and deleting wait. */
  readonly busy = input(false);
  readonly open = output<OpenRequest>();
  readonly replace = output<DocumentRow>();
  readonly remove = output<DocumentRow>();

  protected readonly title = DOCUMENTS_TITLE;
  protected readonly linkNote = LINK_NOTE;
  protected readonly emptyTitle = NO_DOCUMENTS_TITLE;
  protected readonly emptyText = NO_DOCUMENTS_TEXT;
}
