import { SortableListTable } from '@shared/ui/data-table/list-table';
import { Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataCardDirective } from '@shared/ui/data-table/data-card.directive';
import { DataCellDirective } from '@shared/ui/data-table/data-cell.directive';
import { DataDetailDirective } from '@shared/ui/data-table/data-detail.directive';
import { DataSkeletonCardDirective } from '@shared/ui/data-table/data-skeleton-card.directive';
import { DataTableComponent } from '@shared/ui/data-table/data-table.component';
import type { DataColumn } from '@shared/ui/data-table/data-table.component';
import { OpenRows } from '@shared/ui/data-table/open-rows';
import { NgTemplateOutlet } from '@angular/common';
import { SkeletonBlockComponent } from '@shared/ui/skeleton/skeleton-block.component';
import { StatusBadgeComponent } from '@shared/ui/status-badge/status-badge.component';
import type { HistoryRow, SortKey } from '../model/payment-history';

type Column = SortKey | 'what' | 'sent' | 'state' | 'action';

const COLUMNS: readonly DataColumn<Column>[] = [
  { key: 'date', label: 'Mes', sortable: true, rowHeader: true },
  { key: 'what', label: 'Comprobantes' },
  { key: 'sent', label: 'Enviado' },
  { key: 'amount', label: 'Monto', sortable: true, align: 'end' },
  { key: 'state', label: 'Estado', skeleton: { shape: 'badge' } },
  {
    key: 'action',
    label: 'Acciones',
    hiddenLabel: true,
    align: 'action',
    skeleton: { width: '8rem' },
  },
];

/**
 * H4 «Tus pagos» on `app-data-table`: each month with what was sent, its state and «Corregir
 * pago» or «Ver pago»; «Ver detalle» unfolds the row (P-24) with the proofs and what happened.
 * The reason of a rejection is always under its row. The page filters and sorts.
 */
@Component({
  selector: 'app-payment-history-table',
  imports: [
    DataCardDirective,
    DataCellDirective,
    DataDetailDirective,
    DataSkeletonCardDirective,
    DataTableComponent,
    NgTemplateOutlet,
    RouterLink,
    SkeletonBlockComponent,
    StatusBadgeComponent,
  ],
  template: `
    <ng-template #reason let-row>
      <p class="reason"><strong>Motivo:</strong> {{ row.reason }}</p>
    </ng-template>
    <ng-template #unfolded let-row>
      <div class="unfolded">
        <div>
          <h3>Comprobantes</h3>
          <ul class="proofs">
            @for (proof of row.proofs; track $index) {
              <li>
                <span
                  ><strong>{{ proof.kind }}</strong
                  ><span class="detail">{{ proof.detail }}</span></span
                >
                <span class="amount"
                  ><strong>{{ proof.amount }}</strong
                  ><span class="detail">{{ proof.note }}</span></span
                >
              </li>
            }
          </ul>
          @if (row.outcome) {
            <p class="outcome">{{ row.outcome }}</p>
          }
        </div>
        <div>
          <h3>Lo que pasó</h3>
          <ol class="events">
            @for (event of row.events; track $index) {
              <li>
                <span class="when">{{ event.date }}</span
                ><span>{{ event.text }}</span>
              </li>
            }
          </ol>
        </div>
      </div>
    </ng-template>
    <ng-template #toggle let-row>
      <button
        class="quipu-button quipu-button--tertiary"
        type="button"
        [attr.aria-expanded]="open.isOpen(row.id)"
        (click)="open.toggle(row.id)"
      >
        {{ open.isOpen(row.id) ? 'Ocultar detalle' : 'Ver detalle' }}
      </button>
    </ng-template>

    <app-data-table
      caption="Tus pagos"
      [loading]="loading()"
      [skeletonBefore]="skeletonBefore()"
      [columns]="columns"
      [rows]="rows()"
      [rowId]="rowId"
      [sort]="sort()"
      [openRows]="detailIds()"
      (sortBy)="sorted($event)"
    >
      <ng-template appDataSkeletonCard>
        <app-skeleton-block width="55%" height="1.25rem" /><app-skeleton-block width="75%" />
      </ng-template>
      <ng-template appDataCell="date" [appDataCellRows]="rows()" let-row>
        <strong class="quipu-name">{{ row.title }}</strong>
        <span class="detail">{{ row.sub }}</span>
      </ng-template>
      <ng-template appDataCell="what" [appDataCellRows]="rows()" let-row>{{
        row.what
      }}</ng-template>
      <ng-template appDataCell="sent" [appDataCellRows]="rows()" let-row>
        <span class="figures">{{ row.date }}</span>
      </ng-template>
      <ng-template appDataCell="amount" [appDataCellRows]="rows()" let-row>
        <strong class="figures">{{ row.amount }}</strong>
        <span class="detail">{{ row.amountNote }}</span>
      </ng-template>
      <ng-template appDataCell="state" [appDataCellRows]="rows()" let-row>
        <app-status-badge [tone]="row.badge.tone" [label]="row.badge.label" />
      </ng-template>
      <ng-template appDataCell="action" [appDataCellRows]="rows()" let-row>
        @if (row.fix) {
          <a class="quipu-button quipu-button--primary" [routerLink]="['/guest/payments', row.id]"
            >Corregir pago</a
          >
        } @else if (row.view) {
          <a [routerLink]="['/guest/payments', row.id]">Ver pago</a>
        }
        @if (row.detail) {
          <ng-container
            [ngTemplateOutlet]="toggle"
            [ngTemplateOutletContext]="{ $implicit: row }"
          />
        }
      </ng-template>
      <ng-template appDataDetail [appDataDetailRows]="rows()" let-row>
        @if (row.reason) {
          <ng-container
            [ngTemplateOutlet]="reason"
            [ngTemplateOutletContext]="{ $implicit: row }"
          />
        }
        @if (open.isOpen(row.id)) {
          <ng-container
            [ngTemplateOutlet]="unfolded"
            [ngTemplateOutletContext]="{ $implicit: row }"
          />
        }
      </ng-template>

      <ng-template appDataCard [appDataCardRows]="rows()" let-row>
        <div class="card-head">
          <div class="card-who">
            <strong class="quipu-name">{{ row.title }}</strong>
            <span class="detail">{{ row.what }}</span>
          </div>
          <strong class="figures">{{ row.amount }}</strong>
        </div>
        <div class="card-state">
          <app-status-badge [tone]="row.badge.tone" [label]="row.badge.label" />
          <span class="detail">{{ row.date }}</span>
        </div>
        @if (row.reason) {
          <ng-container
            [ngTemplateOutlet]="reason"
            [ngTemplateOutletContext]="{ $implicit: row }"
          />
        }
        @if (row.fix) {
          <a class="quipu-button quipu-button--primary" [routerLink]="['/guest/payments', row.id]"
            >Corregir pago</a
          >
        } @else if (row.view) {
          <a [routerLink]="['/guest/payments', row.id]">Ver pago</a>
        }
        @if (row.detail) {
          <ng-container
            [ngTemplateOutlet]="toggle"
            [ngTemplateOutletContext]="{ $implicit: row }"
          />
        }
        @if (open.isOpen(row.id)) {
          <ng-container
            [ngTemplateOutlet]="unfolded"
            [ngTemplateOutletContext]="{ $implicit: row }"
          />
        }
      </ng-template>
    </app-data-table>
  `,
  // The table, its headers, the cards, the badges and the buttons are the kit's; here only what the
  // cells and the unfolded detail of H4 need.
  styles: `
    :host {
      display: block;
      --quipu-tabla-ancho-minimo: 900px;
    }
    .detail {
      display: block;
      font: var(--mat-sys-body-small);
      color: var(--quipu-tinta-secundaria);
    }
    .figures {
      font-variant-numeric: tabular-nums;
    }
    .card-head,
    .card-state {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
    }
    .card-state {
      align-items: center;
      flex-wrap: wrap;
    }
    .card-who {
      display: grid;
      gap: 0.25rem;
      min-width: 0;
    }
    .reason {
      margin: 0;
      padding: 0.875rem 1.125rem;
      border-radius: var(--quipu-radio);
      background: var(--quipu-aviso-error-fondo);
      color: var(--quipu-aviso-error-texto);
      line-height: 1.5;
    }
    .unfolded {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
      gap: 1.5rem;
      padding: 0.75rem 0 1.25rem;
    }
    h3 {
      margin: 0 0 0.5rem;
      font: var(--mat-sys-body-medium);
      font-weight: var(--quipu-peso-fuerte);
      color: var(--quipu-tinta-secundaria);
    }
    .proofs,
    .events {
      display: grid;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .proofs {
      gap: var(--quipu-franja);
    }
    .proofs li {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 0.25rem 0.75rem;
      padding: 0.75rem 0.875rem;
      border-radius: var(--quipu-radio);
      background: var(--quipu-piedra);
    }
    .amount {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .outcome {
      margin: 0.625rem 0 0;
      line-height: 1.5;
    }
    .events {
      gap: 0.625rem;
    }
    .events li {
      display: grid;
      grid-template-columns: 4rem 1fr;
      gap: 0.75rem;
      line-height: 1.45;
    }
    .when {
      font-weight: var(--quipu-peso-enfasis);
      font-variant-numeric: tabular-nums;
      color: var(--quipu-tinta-secundaria);
    }
  `,
})
export class PaymentHistoryTableComponent extends SortableListTable<HistoryRow, SortKey, Column> {
  protected readonly columns = COLUMNS;
  protected readonly rowId = (row: HistoryRow): string => row.id;
  protected readonly open = new OpenRows();
  /** The rows that show something under them: the rejected (their reason) and the open ones. */
  protected readonly detailIds = computed(() => [
    ...this.rows()
      .filter((row) => row.reason !== null)
      .map((row) => row.id),
    ...this.open.ids(),
  ]);
}
