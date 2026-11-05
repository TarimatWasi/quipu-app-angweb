import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StatusBadgeComponent } from '@shared/ui/status-badge/status-badge.component';
import { COLUMNS } from '../model/payment-queue';
import type { QueueRow, QueueSort, SortKey } from '../model/payment-queue';
import type { QueueViewParam } from '../model/queue-views';

/**
 * A5 «Pagos recibidos»: a table with sortable headers on a wide screen and one card per payment
 * on a phone (only one of them is displayed). The page sorts: a header only emits its column.
 */
@Component({
  selector: 'app-payments-table',
  imports: [RouterLink, StatusBadgeComponent],
  template: `
    <div class="quipu-table-wrap quipu-only-wide">
      <table class="quipu-table">
        <caption class="cdk-visually-hidden">
          {{
            caption()
          }}
        </caption>
        <thead>
          <tr>
            @for (column of columns(); track column.key) {
              <th scope="col" [attr.aria-sort]="column.ariaSort">
                <button
                  class="quipu-sort"
                  type="button"
                  [class.active]="column.active"
                  (click)="sortBy.emit(column.key)"
                >
                  {{ column.label }}
                  <svg
                    class="quipu-sort-arrow"
                    [class.down]="column.down"
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
            <th scope="col">Estado</th>
            <th scope="col"><span class="cdk-visually-hidden">Acción</span></th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.id) {
            <tr>
              <th scope="row">
                @if (row.name; as fullName) {
                  <span class="quipu-name">{{ fullName }}</span>
                } @else {
                  <span class="quipu-unnamed">Sin nombre</span>
                }
                <span class="detail"
                  ><span class="number">{{ row.document }}</span> · {{ row.type }}</span
                >
              </th>
              <td>{{ row.environment }}</td>
              <td>{{ row.period }}</td>
              <td class="number">
                {{ row.submitted }}
                @if (row.ago; as ago) {
                  <span class="detail">{{ ago }}</span>
                }
              </td>
              <td>{{ row.proofs }}</td>
              <td>
                <app-status-badge [tone]="row.badge.tone" [label]="row.badge.label" />
                @if (row.resolvedBy; as by) {
                  <span class="detail resolved">{{ by }}</span>
                }
              </td>
              <td class="action">
                <a
                  [class.quipu-button]="row.primary"
                  [class.quipu-button--primary]="row.primary"
                  [class.quipu-button--row]="row.primary"
                  [routerLink]="['/admin/payments', row.id]"
                  [queryParams]="{ vista: view() }"
                  [attr.aria-label]="row.actionName"
                  >{{ row.action }}</a
                >
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    <ul class="quipu-card-list quipu-only-narrow" [attr.aria-label]="caption()">
      @for (row of rows(); track row.id) {
        <li class="quipu-card">
          <div class="card-head">
            <div class="card-who">
              <p class="card-name">
                @if (row.name; as fullName) {
                  <span class="quipu-name">{{ fullName }}</span>
                } @else {
                  <span class="quipu-unnamed">Sin nombre</span>
                }
              </p>
              <p class="detail">
                <span class="number">{{ row.document }}</span> · {{ row.type }}
              </p>
            </div>
            <span class="card-environment">{{ row.environment }}</span>
          </div>
          <p>{{ row.period }} · subido {{ row.submitted }} · {{ row.proofs }}</p>
          <div class="card-state">
            <app-status-badge [tone]="row.badge.tone" [label]="row.badge.label" />
            @if (row.ago; as ago) {
              <span class="detail">{{ ago }}</span>
            }
          </div>
          @if (row.resolvedBy; as by) {
            <p class="detail">{{ by }}</p>
          }
          <a
            [class.quipu-button]="row.primary"
            [class.quipu-button--primary]="row.primary"
            [routerLink]="['/admin/payments', row.id]"
            [queryParams]="{ vista: view() }"
            [attr.aria-label]="row.actionName"
            >{{ row.action }}</a
          >
        </li>
      }
    </ul>
  `,
  // The table, its sortable headers, the cards, the names and the buttons are the kit's
  // (styles.scss); here only what A5 adds.
  styles: `
    :host {
      display: block;
    }
    table {
      min-width: 900px;
    }
    .detail {
      display: block;
      font: var(--mat-sys-body-small);
      color: var(--quipu-tinta-secundaria);
    }
    .number {
      font-variant-numeric: tabular-nums;
    }
    .resolved {
      margin-top: 0.375rem;
    }
    .action {
      text-align: right;
      white-space: nowrap;
    }
    .card-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
    }
    .card-who {
      display: grid;
      gap: 0.25rem;
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .card-name {
      font-size: var(--quipu-texto-intro-size);
    }
    .card-environment {
      font-weight: var(--quipu-peso-enfasis);
      text-align: right;
    }
    .card-state {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }
  `,
})
export class PaymentsTableComponent {
  readonly rows = input.required<readonly QueueRow[]>();
  readonly sort = input.required<QueueSort>();
  /** The view the rows belong to, so A5.2 can come back to it. */
  readonly view = input.required<QueueViewParam>();
  /** The name of the table and of the list of cards: the view («Por revisar»). */
  readonly caption = input.required<string>();
  /** A sortable header was pressed. */
  readonly sortBy = output<SortKey>();

  /** Each sortable header with whether it orders the list, and which way. */
  protected readonly columns = computed(() => {
    const { key, direction } = this.sort();
    return COLUMNS.map((column) => {
      const active = column.key === key;
      return {
        ...column,
        active,
        down: active && direction === 'desc',
        ariaSort: active ? (direction === 'asc' ? 'ascending' : 'descending') : null,
      };
    });
  });
}
