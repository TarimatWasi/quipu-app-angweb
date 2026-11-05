import { Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { StatusBadgeComponent } from '@shared/ui/status-badge/status-badge.component';
import { StatusFilterComponent } from '@shared/ui/status-filter/status-filter.component';
import type { StatusSegment } from '@shared/ui/status-filter/status-filter.component';
import {
  DEFAULT_PERIOD_SORT,
  nextPeriodSort,
  PERIOD_BADGES,
  REJECTED_TEXT,
  showingText,
  sortPeriods,
  stateCounts,
} from '../model/period-rows';
import type { PeriodRow, PeriodSort, PeriodSortKey, PeriodState } from '../model/period-rows';

const COLUMNS: readonly { readonly key: PeriodSortKey; readonly label: string }[] = [
  { key: 'month', label: 'Mes' },
  { key: 'due', label: 'Vence' },
  { key: 'amount', label: 'Monto' },
  { key: 'state', label: 'Estado' },
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
  imports: [EmptyStateComponent, RouterLink, StatusBadgeComponent, StatusFilterComponent],
  template: `
    <section class="section" aria-labelledby="periods-title">
      <h2 id="periods-title">Pagos por mes</h2>
      @if (rows().length === 0) {
        <app-empty-state heading="Aún no tiene meses por cobrar.">
          Aparecen cuando le cargues un contrato.
        </app-empty-state>
      } @else {
        <app-status-filter
          noun="meses"
          [segments]="segments()"
          [selected]="selected()"
          (chosen)="choose($event)"
        />
        <p class="count">
          <output aria-live="polite">{{ showing() }}</output>
        </p>
        <div class="quipu-table-wrap quipu-only-wide">
          <table class="quipu-table">
            <caption class="cdk-visually-hidden">
              Pagos por mes
            </caption>
            <thead>
              <tr>
                @for (column of columns; track column.key) {
                  <th
                    scope="col"
                    [class.money]="column.key === 'amount'"
                    [attr.aria-sort]="ariaSort(column.key)"
                  >
                    <button
                      class="quipu-sort"
                      type="button"
                      [class.active]="sort().key === column.key"
                      (click)="sortBy(column.key)"
                    >
                      {{ column.label }}
                      <svg
                        class="quipu-sort-arrow"
                        [class.down]="sort().key === column.key && sort().direction === 'desc'"
                        aria-hidden="true"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <path d="M12 19V5M6 11l6-6 6 6" />
                      </svg>
                    </button>
                  </th>
                }
                <th scope="col"><span class="cdk-visually-hidden">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              @for (row of shown(); track row.period) {
                <tr>
                  <th scope="row" class="quipu-name">{{ row.month }}</th>
                  <td class="figures">{{ row.due }}</td>
                  <td class="money figures">{{ row.amount }}</td>
                  <td>
                    <app-status-badge [tone]="row.badge.tone" [label]="row.badge.label" />
                    @if (row.rejected) {
                      <span class="rejected">{{ rejectedText }}</span>
                    }
                  </td>
                  <td class="action">
                    @if (row.action; as action) {
                      <a [routerLink]="action.link" [queryParams]="action.query"
                        >{{ action.label
                        }}<span class="cdk-visually-hidden"> de {{ row.month }}</span></a
                      >
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <ul class="quipu-card-list quipu-only-narrow" aria-label="Pagos por mes">
          @for (row of shown(); track row.period) {
            <li class="quipu-card">
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
            </li>
          }
        </ul>
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
    th.money .quipu-sort {
      flex-direction: row-reverse;
    }
    .rejected {
      display: block;
      margin-top: 0.375rem;
      font: var(--mat-sys-body-small);
      font-weight: var(--quipu-peso-enfasis);
      color: var(--quipu-error);
    }
    .action {
      text-align: right;
      white-space: nowrap;
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
  readonly rows = input.required<readonly PeriodRow[]>();

  protected readonly columns = COLUMNS;
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

  protected sortBy(key: PeriodSortKey): void {
    this.sort.update((current) => nextPeriodSort(current, key));
  }

  protected ariaSort(key: PeriodSortKey): 'ascending' | 'descending' | null {
    if (this.sort().key !== key) return null;
    return this.sort().direction === 'asc' ? 'ascending' : 'descending';
  }
}
