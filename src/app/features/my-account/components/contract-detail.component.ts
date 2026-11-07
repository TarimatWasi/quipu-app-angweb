import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FactTileComponent } from '@shared/ui/fact-tile/fact-tile.component';
import { PageNoticeComponent } from '@shared/ui/page-notice/page-notice.component';
import { StatusBadgeComponent } from '@shared/ui/status-badge/status-badge.component';
import { FILE_LINK_NOTE } from '../model/own-contract';
import type { ContractBlock } from '../model/own-contract';

/**
 * H2: one contract as the canvas «MiContrato» draws it: its state with the notice, what was
 * agreed (P-11) and its file. It is used for the contract in force and for the next one; the
 * latter has no headings of its own because the page puts «Tu próximo contrato» above it. It only
 * shows and reports a press on the file link: the page decides if the link still works.
 */
@Component({
  selector: 'app-contract-detail',
  imports: [FactTileComponent, PageNoticeComponent, RouterLink, StatusBadgeComponent],
  template: `
    <section [attr.aria-labelledby]="headings() ? 'state-title' : null" class="block">
      @if (headings()) {
        <h2 id="state-title" class="cdk-visually-hidden">Estado del contrato</h2>
      }
      <p class="state">
        <app-status-badge [tone]="block().state.tone" [label]="block().state.label" />
        <span>{{ block().text }}</span>
      </p>
      @if (block().notice; as notice) {
        <app-page-notice [tone]="notice.tone" [heading]="notice.heading">
          {{ notice.text }}
          @if (notice.accountLink) {
            <a noticeAction routerLink="/home">Ver estado de cuenta</a>
          }
        </app-page-notice>
      }
    </section>

    <section [attr.aria-labelledby]="headings() ? 'facts-title' : null" class="block">
      @if (headings()) {
        <h2 id="facts-title">Lo que acordaste</h2>
      }
      <div class="facts">
        @for (fact of block().facts; track fact.label) {
          <app-fact-tile [label]="fact.label" [value]="fact.value" [hint]="fact.hint" />
        }
      </div>
    </section>

    <section [attr.aria-labelledby]="headings() ? 'file-title' : null" class="block file">
      @if (headings()) {
        <h2 id="file-title">El documento</h2>
      }
      <div class="card">
        <span class="icon" aria-hidden="true">
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="4" y="3" width="16" height="18" rx="1" />
            <path d="M8 8h8M8 12h8M8 16h5" />
          </svg>
        </span>
        <span class="what">
          <strong>{{ block().file.name }}</strong>
          <span class="meta">{{ block().file.meta }}</span>
        </span>
        @if (block().file.url; as url) {
          <a
            class="quipu-button quipu-button--secondary"
            target="_blank"
            rel="noopener noreferrer"
            [href]="url"
            (click)="open.emit($event)"
            >{{ openLabel() }}</a
          >
        } @else {
          <button
            class="quipu-button quipu-button--secondary"
            type="button"
            (click)="open.emit($event)"
          >
            {{ openLabel() }}
          </button>
        }
      </div>
      @if (headings()) {
        <p class="note">{{ linkNote }}</p>
      }
    </section>
  `,
  styles: `
    :host {
      display: grid;
      gap: 2.5rem;
    }
    .block {
      display: grid;
      gap: 0.875rem;
      align-content: start;
    }
    h2,
    p {
      margin: 0;
    }
    .state {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.625rem 1rem;
      font: var(--mat-sys-body-large);
    }
    .facts {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--quipu-franja);
    }
    .facts app-fact-tile {
      --quipu-cifra-ficha: var(--quipu-cifra-resumen);
      --quipu-cifra-ficha-movil: var(--quipu-cifra-resumen-movil);
      overflow-wrap: anywhere;
    }
    .file {
      max-width: var(--quipu-columna-formulario);
    }
    .card {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.875rem 1.125rem;
      padding: var(--quipu-relleno-tarjeta);
      border-radius: var(--quipu-radio);
      background: var(--quipu-alpaca);
    }
    .icon {
      display: grid;
      place-items: center;
      width: 3.25rem;
      height: 4rem;
      border-radius: var(--quipu-radio);
      background: var(--quipu-piedra-oscura);
      color: var(--quipu-tinta-secundaria);
    }
    .what {
      display: grid;
      flex: 1 1 12rem;
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .meta,
    .note {
      font: var(--mat-sys-body-small);
      color: var(--quipu-tinta-secundaria);
    }
    @media (max-width: 599.98px) {
      .facts {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .card .quipu-button {
        flex: 1 1 100%;
      }
    }
  `,
})
export class ContractDetailComponent {
  readonly block = input.required<ContractBlock>();
  /** The headings of the sections; the next contract goes without them. */
  readonly headings = input(true);
  readonly openLabel = input('Ver contrato');
  /** A press on the file link; the page may cancel it (a link that expired or never came). */
  readonly open = output<Event>();

  protected readonly linkNote = FILE_LINK_NOTE;
}
