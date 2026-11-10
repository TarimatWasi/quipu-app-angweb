import { Component, computed, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DataCardDirective } from '@shared/ui/data-table/data-card.directive';
import { DataCellDirective } from '@shared/ui/data-table/data-cell.directive';
import { DataDetailDirective } from '@shared/ui/data-table/data-detail.directive';
import { DataSkeletonCardDirective } from '@shared/ui/data-table/data-skeleton-card.directive';
import { DataTableComponent } from '@shared/ui/data-table/data-table.component';
import type { DataColumn } from '@shared/ui/data-table/data-table.component';
import { ListTable } from '@shared/ui/data-table/list-table';
import { ListResultsComponent } from '@shared/ui/list-results/list-results.component';
import { SkeletonBlockComponent } from '@shared/ui/skeleton/skeleton-block.component';
import { StatusBadgeComponent } from '@shared/ui/status-badge/status-badge.component';
import {
  GUEST_PAYMENTS_EMPTY,
  GUEST_PAYMENTS_HEADING,
  GUEST_PAYMENTS_LOAD_ERROR,
  GUEST_PAYMENTS_NO_MATCH,
} from '../model/guest-payments';
import type { GuestPaymentRow } from '../model/guest-payments';

type Column = 'month' | 'amount' | 'state' | 'action';

// A3.2 gives this table its narrow column: three columns of data share it evenly, and the action
// column takes what its longest link needs («Corregir pago») instead of the 14 rem of a list.
const COLUMNS: readonly DataColumn<Column>[] = [
  { key: 'month', label: 'Mes', rowHeader: true },
  { key: 'amount', label: 'Monto', align: 'end', grow: 2 },
  { skeleton: { shape: 'badge' }, key: 'state', label: 'Estado', grow: 2 },
  { key: 'action', label: 'Acciones', hiddenLabel: true, align: 'action', width: '11rem' },
];

/**
 * A3.2 «Historial de pagos» (RF-10): each payment of the guest, newest first as the BFF answers,
 * page by page with «Mostrar más»; each one opens its review in A5.2. While the first page loads it
 * is the same table in its skeleton (QP-UI-19), so nothing moves when the rows arrive. The page
 * reads; this only shows.
 */
@Component({
  selector: 'app-guest-payments',
  imports: [
    DataCardDirective,
    DataCellDirective,
    DataDetailDirective,
    DataSkeletonCardDirective,
    DataTableComponent,
    ListResultsComponent,
    NgTemplateOutlet,
    RouterLink,
    SkeletonBlockComponent,
    StatusBadgeComponent,
  ],
  template: `
    <section class="section" aria-labelledby="guest-payments-title">
      <h2 id="guest-payments-title">{{ heading }}</h2>
      <ng-template #table>
        <app-data-table
          [loading]="loading()"
          [caption]="heading"
          [columns]="columns"
          [rows]="rows()"
          [rowId]="rowId"
          [openRows]="rejectedIds()"
        >
          <ng-template appDataSkeletonCard
            ><app-skeleton-block width="65%" /><app-skeleton-block
              shape="badge" /><app-skeleton-block width="85%" /><app-skeleton-block width="7rem"
          /></ng-template>
          <ng-template appDataCell="month" [appDataCellRows]="rows()" let-row>
            {{ row.month }}
            <span class="detail">{{ row.sent }}</span>
          </ng-template>
          <ng-template appDataCell="amount" [appDataCellRows]="rows()" let-row>
            <span class="figures">{{ row.amount }}</span>
            <span class="detail">{{ row.proofs }}</span>
          </ng-template>
          <ng-template appDataCell="state" [appDataCellRows]="rows()" let-row>
            <app-status-badge [tone]="row.badge.tone" [label]="row.badge.label" />
          </ng-template>
          <ng-template appDataCell="action" [appDataCellRows]="rows()" let-row>
            <a [routerLink]="row.action.link"
              >{{ row.action.label }}<span class="cdk-visually-hidden"> de {{ row.month }}</span></a
            >
          </ng-template>

          <ng-template appDataDetail [appDataDetailRows]="rows()" let-row>
            <p class="reason">{{ row.reason }}</p>
          </ng-template>

          <ng-template appDataCard [appDataCardRows]="rows()" let-row>
            <div class="card-head">
              <p class="quipu-name">{{ row.month }}</p>
              <p class="money figures">{{ row.amount }}</p>
            </div>
            <p class="detail">{{ row.sent }} · {{ row.proofs }}</p>
            <div>
              <app-status-badge [tone]="row.badge.tone" [label]="row.badge.label" />
              @if (row.reason) {
                <span class="reason">{{ row.reason }}</span>
              }
            </div>
            <a [routerLink]="row.action.link"
              >{{ row.action.label }}<span class="cdk-visually-hidden"> de {{ row.month }}</span></a
            >
          </ng-template>
        </app-data-table>
      </ng-template>

      @if (loading()) {
        <ng-container [ngTemplateOutlet]="table" />
      } @else {
        <app-list-results
          [shown]="rows().length"
          [loaded]="rows().length"
          [noMatchHeading]="noMatchHeading"
          [empty]="empty"
          [errorText]="loadErrorText"
          [listFailed]="listFailed()"
          [moreFailed]="moreFailed()"
          [retrying]="retrying()"
          [hasMore]="hasMore()"
          [loadingMore]="loadingMore()"
          (retry)="retry.emit()"
          (more)="more.emit()"
        >
          <ng-container [ngTemplateOutlet]="table" />
        </app-list-results>
      }
    </section>
  `,
  // Table, cards, badges, empty state, error and «Mostrar más» are the kit's; here only places and
  // gaps, the same as «Pagos por mes» above it.
  styles: `
    :host {
      display: block;
    }
    .section {
      display: grid;
      gap: 1rem;
    }
    h2,
    p {
      margin: 0;
    }
    .figures {
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .money {
      text-align: right;
    }
    .card-head {
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
    }
    .detail {
      display: block;
      font: var(--mat-sys-body-small);
      font-weight: normal;
      color: var(--quipu-tinta-secundaria);
    }
    .reason {
      display: block;
      margin: 0.375rem 0 0;
      font: var(--mat-sys-body-small);
      font-weight: var(--quipu-peso-enfasis);
      color: var(--quipu-error);
    }
  `,
})
export class GuestPaymentsComponent extends ListTable<GuestPaymentRow> {
  /** The first page failed, or a refresh of it: the error with «Reintentar» instead of the rows. */
  readonly listFailed = input(false);
  /** The next page failed: the error under the rows. */
  readonly moreFailed = input(false);
  readonly retrying = input(false);
  readonly hasMore = input(false);
  readonly loadingMore = input(false);
  readonly retry = output();
  readonly more = output();

  protected readonly heading = GUEST_PAYMENTS_HEADING;
  protected readonly columns = COLUMNS;
  protected readonly loadErrorText = GUEST_PAYMENTS_LOAD_ERROR;
  protected readonly noMatchHeading = GUEST_PAYMENTS_NO_MATCH;
  protected readonly empty = GUEST_PAYMENTS_EMPTY;
  protected readonly rowId = (row: GuestPaymentRow): string => row.id;
  /** The rejected rows: the reason goes under its row, whole, not cut in a narrow cell. */
  protected readonly rejectedIds = computed(() =>
    this.rows()
      .filter((row) => row.reason !== null)
      .map((row) => row.id),
  );
}
