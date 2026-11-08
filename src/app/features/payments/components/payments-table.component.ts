import { SkeletonBlockComponent } from '@shared/ui/skeleton/skeleton-block.component';
import { DataSkeletonCardDirective } from '@shared/ui/data-table/data-skeleton-card.directive';
import { DataSkeletonCellDirective } from '@shared/ui/data-table/data-skeleton-cell.directive';
import { Component, input, output, TemplateRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataCardDirective } from '@shared/ui/data-table/data-card.directive';
import { DataCellDirective } from '@shared/ui/data-table/data-cell.directive';
import { DataTableComponent } from '@shared/ui/data-table/data-table.component';
import type { DataColumn } from '@shared/ui/data-table/data-table.component';
import { StatusBadgeComponent } from '@shared/ui/status-badge/status-badge.component';
import type { QueueRow, QueueSort, SortKey } from '../model/payment-queue';
import type { QueueViewParam } from '../model/queue-views';

type Column = SortKey | 'state' | 'action';

const COLUMNS: readonly DataColumn<Column>[] = [
  {
    skeleton: { width: '85%' },
    key: 'guest',
    label: 'Huésped',
    sortable: true,
    rowHeader: true,
    width: '22%',
  },
  { key: 'environment', label: 'Ambiente', sortable: true, width: '13%' },
  { key: 'period', label: 'Período', sortable: true, width: '12%' },
  { key: 'submitted', label: 'Subido', sortable: true, width: '13%' },
  { key: 'proofs', label: 'Comprobantes', sortable: true, width: '14%' },
  { skeleton: { shape: 'badge' }, key: 'state', label: 'Estado', width: '14%' },
  {
    skeleton: { shape: 'rectangle', width: '7rem', height: '2rem' },
    key: 'action',
    label: 'Acción',
    hiddenLabel: true,
    align: 'action',
    width: '9rem',
  },
];

/**
 * A5 «Pagos recibidos» on `app-data-table`: what each column of a payment says and its card on a
 * phone. The page sorts: a header only emits its column.
 */
@Component({
  selector: 'app-payments-table',
  imports: [
    SkeletonBlockComponent,
    DataSkeletonCardDirective,
    DataSkeletonCellDirective,
    DataCardDirective,
    DataCellDirective,
    DataTableComponent,
    RouterLink,
    StatusBadgeComponent,
  ],
  template: `
    <app-data-table
      [loading]="loading()"
      [skeletonBefore]="skeletonBefore()"
      [caption]="caption()"
      [columns]="columns"
      [rows]="rows()"
      [rowId]="rowId"
      [sort]="sort()"
      (sortBy)="sorted($event)"
    >
      <ng-template appDataSkeletonCell="guest">
        <app-skeleton-block width="85%" />
        <app-skeleton-block class="skeleton-detail" width="65%" height="0.75rem" />
      </ng-template>
      <ng-template appDataSkeletonCard>
        <div class="card-head">
          <div class="card-who skeleton-who">
            <app-skeleton-block width="85%" height="1.25rem" />
            <app-skeleton-block width="70%" height="0.75rem" />
          </div>
          <app-skeleton-block width="2rem" />
        </div>
        <app-skeleton-block width="100%" />
        <app-skeleton-block shape="badge" />
        <app-skeleton-block shape="rectangle" width="8rem" />
      </ng-template>
      <ng-template appDataCell="guest" [appDataCellRows]="rows()" let-row>
        @if (row.name; as fullName) {
          <span class="quipu-name">{{ fullName }}</span>
        } @else {
          <span class="quipu-unnamed">Sin nombre</span>
        }
        <span class="detail"
          ><span class="number">{{ row.document }}</span> · {{ row.type }}</span
        >
      </ng-template>
      <ng-template appDataCell="environment" [appDataCellRows]="rows()" let-row>{{
        row.environment
      }}</ng-template>
      <ng-template appDataCell="period" [appDataCellRows]="rows()" let-row>
        {{ row.period }}
        @if (row.reason; as reason) {
          <span class="detail reason">{{ reason }}</span>
        }
      </ng-template>
      <ng-template appDataCell="submitted" [appDataCellRows]="rows()" let-row>
        <span class="number">{{ row.submitted }}</span>
        @if (row.ago; as ago) {
          <span class="detail">{{ ago }}</span>
        }
      </ng-template>
      <ng-template appDataCell="proofs" [appDataCellRows]="rows()" let-row>{{
        row.proofs
      }}</ng-template>
      <ng-template appDataCell="state" [appDataCellRows]="rows()" let-row>
        <app-status-badge [tone]="row.badge.tone" [label]="row.badge.label" />
        @if (row.resolvedBy; as by) {
          <span class="detail resolved">{{ by }}</span>
        }
      </ng-template>
      <ng-template appDataCell="action" [appDataCellRows]="rows()" let-row>
        <a
          [class.quipu-button]="row.primary"
          [class.quipu-button--primary]="row.primary"
          [class.quipu-button--row]="row.primary"
          [routerLink]="['/admin/payments', row.id]"
          [queryParams]="{ vista: view() }"
          [attr.aria-label]="row.actionName"
          >{{ row.action }}</a
        >
      </ng-template>

      <ng-template appDataCard [appDataCardRows]="rows()" let-row>
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
        @if (row.reason; as reason) {
          <p class="detail reason">{{ reason }}</p>
        }
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
      </ng-template>
    </app-data-table>
  `,
  // The table, the cards, the names, the badges and the buttons are the kit's; here only what the
  // content of A5's cells needs.
  styles: `
    :host {
      display: block;
      --quipu-tabla-ancho-minimo: 900px;
    }
    .skeleton-who {
      width: 75%;
    }
    .skeleton-detail {
      margin-top: 0.375rem;
    }
    .detail {
      display: block;
      font: var(--mat-sys-body-small);
      color: var(--quipu-tinta-secundaria);
    }
    .number {
      font-variant-numeric: tabular-nums;
    }
    .reason {
      color: var(--quipu-rojo-texto);
    }
    .resolved {
      margin-top: 0.375rem;
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
  readonly loading = input(false);
  readonly skeletonBefore = input<TemplateRef<unknown> | null>(null);
  readonly rows = input.required<readonly QueueRow[]>();
  readonly sort = input.required<QueueSort>();
  /** The view the rows belong to, so A5.2 can come back to it. */
  readonly view = input.required<QueueViewParam>();
  /** The name of the table and of the list of cards: the view («Por revisar»). */
  readonly caption = input.required<string>();
  /** A sortable header was pressed. */
  readonly sortBy = output<SortKey>();

  protected readonly columns = COLUMNS;
  protected readonly rowId = (row: QueueRow): string => row.id;

  protected sorted(key: Column): void {
    if (key !== 'state' && key !== 'action') this.sortBy.emit(key);
  }
}
