import { Component, input, output, TemplateRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataCardDirective } from '@shared/ui/data-table/data-card.directive';
import { DataCellDirective } from '@shared/ui/data-table/data-cell.directive';
import { DataSkeletonCardDirective } from '@shared/ui/data-table/data-skeleton-card.directive';
import { DataTableComponent } from '@shared/ui/data-table/data-table.component';
import type { DataColumn } from '@shared/ui/data-table/data-table.component';
import { SkeletonBlockComponent } from '@shared/ui/skeleton/skeleton-block.component';
import { StatusBadgeComponent } from '@shared/ui/status-badge/status-badge.component';
import type { ContractRow, ContractSort, SortKey } from '../model/contract';

type Column = SortKey | 'action';

const COLUMNS: readonly DataColumn<Column>[] = [
  { key: 'name', label: 'Huésped', sortable: true, rowHeader: true },
  { key: 'environment', label: 'Ambiente', sortable: true },
  { key: 'fee', label: 'Cuota', sortable: true, align: 'end' },
  { key: 'end', label: 'Vigencia', sortable: true, grow: 1.5 },
  { key: 'state', label: 'Estado', sortable: true, skeleton: { shape: 'badge' } },
  {
    key: 'action',
    label: 'Acciones',
    hiddenLabel: true,
    align: 'action',
    skeleton: { width: '6rem' },
  },
];

/**
 * A4 «Todos los contratos» on `app-data-table`: what each column says, «Ver contrato» of its row and
 * its card on a phone. The page filters and sorts: a header only emits its column.
 */
@Component({
  selector: 'app-contracts-table',
  imports: [
    DataCardDirective,
    DataCellDirective,
    DataSkeletonCardDirective,
    DataTableComponent,
    RouterLink,
    SkeletonBlockComponent,
    StatusBadgeComponent,
  ],
  template: `
    <app-data-table
      caption="Contratos"
      [loading]="loading()"
      [skeletonBefore]="skeletonBefore()"
      [columns]="columns"
      [rows]="rows()"
      [rowId]="rowId"
      [sort]="sort()"
      (sortBy)="sorted($event)"
    >
      <ng-template appDataSkeletonCard>
        <app-skeleton-block width="55%" height="1.25rem" /><app-skeleton-block width="75%" />
      </ng-template>
      <ng-template appDataCell="name" [appDataCellRows]="rows()" let-row>
        <strong class="quipu-name">{{ row.name }}</strong>
        <span class="detail">{{ row.document }}</span>
      </ng-template>
      <ng-template appDataCell="environment" [appDataCellRows]="rows()" let-row>{{
        row.environment
      }}</ng-template>
      <ng-template appDataCell="fee" [appDataCellRows]="rows()" let-row>
        <span class="figures">{{ row.fee }}</span>
        <span class="detail">día {{ row.paymentDay }}</span>
      </ng-template>
      <ng-template appDataCell="end" [appDataCellRows]="rows()" let-row>
        <span class="figures">{{ row.range }}</span>
        @if (row.note) {
          <span class="detail">{{ row.note }}</span>
        }
      </ng-template>
      <ng-template appDataCell="state" [appDataCellRows]="rows()" let-row>
        <app-status-badge [tone]="row.badge.tone" [label]="row.badge.label" />
      </ng-template>
      <ng-template appDataCell="action" [appDataCellRows]="rows()" let-row>
        <a [routerLink]="['/admin/contracts', row.id]" [attr.aria-label]="row.viewName"
          >Ver contrato</a
        >
      </ng-template>

      <ng-template appDataCard [appDataCardRows]="rows()" let-row>
        <div class="card-head">
          <div class="card-who">
            <strong class="quipu-name">{{ row.name }}</strong>
            <span class="detail">{{ row.environment }} · {{ row.document }}</span>
          </div>
          <span class="figures">{{ row.fee }}</span>
        </div>
        <div class="card-state">
          <app-status-badge [tone]="row.badge.tone" [label]="row.badge.label" />
          <span class="detail">{{ row.range }}</span>
        </div>
        @if (row.note) {
          <span class="detail">{{ row.note }}</span>
        }
        <a [routerLink]="['/admin/contracts', row.id]" [attr.aria-label]="row.viewName"
          >Ver contrato</a
        >
      </ng-template>
    </app-data-table>
  `,
  // The table, its headers, the cards, the badges and the links are the kit's; here only what the
  // content of the cells of A4 needs.
  styles: `
    :host {
      display: block;
      --quipu-tabla-ancho-minimo: 960px;
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
  `,
})
export class ContractsTableComponent {
  readonly loading = input(false);
  readonly skeletonBefore = input<TemplateRef<unknown> | null>(null);
  readonly rows = input.required<readonly ContractRow[]>();
  readonly sort = input.required<ContractSort>();
  /** A sortable header was pressed. */
  readonly sortBy = output<SortKey>();

  protected readonly columns = COLUMNS;
  protected readonly rowId = (row: ContractRow): string => row.id;

  protected sorted(key: Column): void {
    if (key !== 'action') this.sortBy.emit(key);
  }
}
