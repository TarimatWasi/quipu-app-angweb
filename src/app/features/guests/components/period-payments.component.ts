import { SkeletonBlockComponent } from '@shared/ui/skeleton/skeleton-block.component';
import { DataSkeletonCardDirective } from '@shared/ui/data-table/data-skeleton-card.directive';
import { Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataCardDirective } from '@shared/ui/data-table/data-card.directive';
import { DataCellDirective } from '@shared/ui/data-table/data-cell.directive';
import { DataTableComponent } from '@shared/ui/data-table/data-table.component';
import type { DataColumn } from '@shared/ui/data-table/data-table.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { StatusBadgeComponent } from '@shared/ui/status-badge/status-badge.component';
import { StatusFilterComponent } from '@shared/ui/status-filter/status-filter.component';
import type { StatusSegment } from '@shared/ui/status-filter/status-filter.component';
import {
  DEFAULT_PERIOD_SORT,
  PERIOD_BADGES,
  REJECTED_TEXT,
  showingText,
  sortPeriods,
  stateCounts,
} from '../model/period-rows';
import type { PeriodRow, PeriodSort, PeriodSortKey, PeriodState } from '../model/period-rows';
import { nextSort } from '@shared/ui/data-table/list-sort';

type Column = PeriodSortKey | 'action';

const COLUMNS: readonly DataColumn<Column>[] = [
  { key: 'month', label: 'Mes', sortable: true, rowHeader: true },
  { key: 'due', label: 'Vence', sortable: true },
  { key: 'amount', label: 'Monto', sortable: true, align: 'end' },
  { skeleton: { shape: 'badge' }, key: 'state', label: 'Estado', sortable: true },
  { key: 'action', label: 'Acciones', hiddenLabel: true, align: 'action' },
];

function isState(key: string | null): key is PeriodState {
  return key !== null && Object.hasOwn(PERIOD_BADGES, key);
}

/**
 * A3.2 «Pagos por mes» (RF-06, RF-10): the bar and the tiles of the states (P-05, P-06) filter the
 * months; the table sorts them by its headers (overdue first and the latest month first by
 * default) and becomes one card per month on a phone. Each month says what to do with its payment.
 */
@Component({
  selector: 'app-period-payments',
  imports: [
    SkeletonBlockComponent,
    DataSkeletonCardDirective,
    DataCardDirective,
    DataCellDirective,
    DataTableComponent,
    EmptyStateComponent,
    RouterLink,
    StatusBadgeComponent,
    StatusFilterComponent,
  ],
  template: `
    <section class="section" aria-labelledby="periods-title">
      <h2 id="periods-title">Pagos por mes</h2>
      @if (!loading() && rows().length === 0) {
        <app-empty-state heading="Aún no tiene meses por cobrar.">
          Aparecen cuando le cargues un contrato.
        </app-empty-state>
      } @else {
        @if (!loading()) {
          <app-status-filter
            noun="meses"
            [segments]="segments()"
            [selected]="selected()"
            (chosen)="choose($event)"
          />
          <p class="count">
            <output aria-live="polite">{{ showing() }}</output>
          </p>
        }
        <app-data-table
          [loading]="loading()"
          caption="Pagos por mes"
          [columns]="columns"
          [rows]="shown()"
          [rowId]="rowId"
          [sort]="sort()"
          (sortBy)="sortBy($event)"
        >
          <ng-template appDataSkeletonCard
            ><app-skeleton-block width="65%" /><app-skeleton-block
              shape="badge" /><app-skeleton-block width="85%" /><app-skeleton-block width="7rem"
          /></ng-template>
          <ng-template appDataCell="month" [appDataCellRows]="shown()" let-row>
            {{ row.month }}
          </ng-template>
          <ng-template appDataCell="due" [appDataCellRows]="shown()" let-row>
            <span class="figures">{{ row.due }}</span>
          </ng-template>
          <ng-template appDataCell="amount" [appDataCellRows]="shown()" let-row>{{
            row.amount
          }}</ng-template>
          <ng-template appDataCell="state" [appDataCellRows]="shown()" let-row>
            <app-status-badge [tone]="row.badge.tone" [label]="row.badge.label" />
            @if (row.rejected) {
              <span class="rejected">{{ rejectedText }}</span>
            }
          </ng-template>
          <ng-template appDataCell="action" [appDataCellRows]="shown()" let-row>
            @if (row.action; as action) {
              <a [routerLink]="action.link" [queryParams]="action.query"
                >{{ action.label }}<span class="cdk-visually-hidden"> de {{ row.month }}</span></a
              >
            }
          </ng-template>

          <ng-template appDataCard [appDataCardRows]="shown()" let-row>
            <div class="card-head">
              <p class="quipu-name">{{ row.month }}</p>
              <p class="money figures">{{ row.amount }}</p>
            </div>
            <p class="detail">Vence el {{ row.due }}</p>
            <div class="card-state">
              <app-status-badge [tone]="row.badge.tone" [label]="row.badge.label" />
              @if (row.rejected) {
                <span class="rejected">{{ rejectedText }}</span>
              }
            </div>
            @if (row.action; as action) {
              <a [routerLink]="action.link" [queryParams]="action.query"
                >{{ action.label }}<span class="cdk-visually-hidden"> de {{ row.month }}</span></a
              >
            }
          </ng-template>
        </app-data-table>
      }
    </section>
  `,
  // Filter, table, cards, badges and sortable headers are the kit's; here only places and gaps.
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
    .count {
      color: var(--quipu-tinta-secundaria);
      font-variant-numeric: tabular-nums;
    }
    .figures {
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .money {
      text-align: right;
      white-space: nowrap;
    }
    .rejected {
      display: block;
      margin-top: 0.375rem;
      font: var(--mat-sys-body-small);
      font-weight: var(--quipu-peso-enfasis);
      color: var(--quipu-error);
    }
    .card-head {
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
    }
    .detail {
      font: var(--mat-sys-body-small);
      color: var(--quipu-tinta-secundaria);
    }
    .card-state .rejected {
      margin-top: 0.25rem;
    }
  `,
})
export class PeriodPaymentsComponent {
  readonly loading = input(false);
  readonly rows = input.required<readonly PeriodRow[]>();

  protected readonly columns = COLUMNS;
  protected readonly rowId = (row: PeriodRow): string => row.key;
  protected readonly rejectedText = REJECTED_TEXT;
  protected readonly selected = signal<PeriodState | null>(null);
  protected readonly sort = signal<PeriodSort>(DEFAULT_PERIOD_SORT);

  protected readonly segments = computed<readonly StatusSegment[]>(() =>
    stateCounts(this.rows()).map(({ state, count }) => ({
      key: state,
      count,
      ...PERIOD_BADGES[state],
    })),
  );
  protected readonly shown = computed(() => {
    const state = this.selected();
    const rows = state === null ? this.rows() : this.rows().filter((row) => row.state === state);
    return sortPeriods(rows, this.sort());
  });
  protected readonly showing = computed(() => showingText(this.shown().length, this.rows().length));

  protected choose(key: string | null): void {
    this.selected.set(isState(key) ? key : null);
  }

  protected sortBy(key: Column): void {
    if (key !== 'action') this.sort.update((current) => nextSort(current, key));
  }
}
