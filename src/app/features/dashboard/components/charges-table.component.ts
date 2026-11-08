import { Component, input, output, TemplateRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataCardDirective } from '@shared/ui/data-table/data-card.directive';
import { DataCellDirective } from '@shared/ui/data-table/data-cell.directive';
import { DataSkeletonCardDirective } from '@shared/ui/data-table/data-skeleton-card.directive';
import { DataTableComponent } from '@shared/ui/data-table/data-table.component';
import type { DataColumn } from '@shared/ui/data-table/data-table.component';
import { SkeletonBlockComponent } from '@shared/ui/skeleton/skeleton-block.component';
import { StatusBadgeComponent } from '@shared/ui/status-badge/status-badge.component';
import type { ChargeRow, ChargeSort, ChargeSortKey } from '../model/dashboard-charges';

type Column = ChargeSortKey | 'action';

const COLUMNS: readonly DataColumn<Column>[] = [
  { key: 'guest', label: 'Huésped', sortable: true, rowHeader: true },
  { key: 'environment', label: 'Ambiente', sortable: true },
  { key: 'period', label: 'Período', sortable: true },
  { key: 'amount', label: 'Monto', sortable: true, align: 'end' },
  { key: 'due', label: 'Vence', sortable: true },
  { key: 'state', label: 'Estado', sortable: true },
  { key: 'action', label: 'Acción', hiddenLabel: true, align: 'action' },
];

/**
 * A1 «Cobros del mes» on `app-data-table` (P-06): what each column of a charge says, the action of
 * its row and its card on a phone. The page filters and sorts: a header only emits its column.
 */
@Component({
  selector: 'app-charges-table',
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
      caption="Cobros del mes"
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
      <ng-template appDataCell="guest" [appDataCellRows]="rows()" let-row>
        @if (row.name; as fullName) {
          <span class="quipu-name">{{ fullName }}</span>
        } @else {
          <span class="quipu-unnamed">Sin nombre</span>
        }
        <span class="detail number">{{ row.document }} · {{ row.typeLabel }}</span>
      </ng-template>
      <ng-template appDataCell="environment" [appDataCellRows]="rows()" let-row>{{
        row.environment
      }}</ng-template>
      <ng-template appDataCell="period" [appDataCellRows]="rows()" let-row>{{
        row.period
      }}</ng-template>
      <ng-template appDataCell="amount" [appDataCellRows]="rows()" let-row
        ><span class="number">{{ row.amountLabel }}</span></ng-template
      >
      <ng-template appDataCell="due" [appDataCellRows]="rows()" let-row
        ><span class="number">{{ row.dueLabel }}</span></ng-template
      >
      <ng-template appDataCell="state" [appDataCellRows]="rows()" let-row>
        <app-status-badge [tone]="row.tone" [label]="row.stateLabel" />
        @if (row.rejected) {
          <span class="rejected in-cell">Pago rechazado</span>
        }
      </ng-template>
      <ng-template appDataCell="action" [appDataCellRows]="rows()" let-row>
        <a
          [class]="actionClass(row, true)"
          [routerLink]="row.action.link"
          [queryParams]="row.action.query"
          [attr.aria-label]="row.action.label + ' de ' + row.actionFor"
          >{{ row.action.label }}</a
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
            <p class="detail">{{ row.environment }} · {{ row.period }}</p>
          </div>
          <span class="number amount">{{ row.amountLabel }}</span>
        </div>
        <div class="card-state">
          <app-status-badge [tone]="row.tone" [label]="row.stateLabel" />
          <span class="detail">Vence {{ row.dueLabel }}</span>
        </div>
        @if (row.rejected) {
          <p class="rejected">Pago rechazado</p>
        }
        <a
          [class]="actionClass(row)"
          [routerLink]="row.action.link"
          [queryParams]="row.action.query"
          [attr.aria-label]="row.action.label + ' de ' + row.actionFor"
          >{{ row.action.label }}</a
        >
      </ng-template>
    </app-data-table>
  `,
  // The table, its headers, the cards, the names and the buttons are the kit's; here only what
  // the content of the cells of A1 needs.
  styles: `
    :host {
      display: block;
      --quipu-tabla-ancho-minimo: 980px;
    }
    .detail {
      display: block;
      font: var(--mat-sys-body-small);
      color: var(--quipu-tinta-secundaria);
    }
    .number {
      font-variant-numeric: tabular-nums;
    }
    .rejected {
      display: block;
      font: var(--mat-sys-body-small);
      font-weight: var(--quipu-peso-enfasis);
      color: var(--quipu-estado-rechazado-texto);
    }
    .in-cell {
      margin-top: 0.375rem;
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
    .amount {
      font-weight: var(--quipu-peso-enfasis);
      white-space: nowrap;
    }
  `,
})
export class ChargesTableComponent {
  readonly rows = input.required<readonly ChargeRow[]>();
  readonly sort = input.required<ChargeSort>();
  readonly loading = input(false);
  readonly skeletonBefore = input<TemplateRef<unknown> | null>(null);
  /** A sortable header was pressed. */
  readonly sortBy = output<ChargeSortKey>();

  protected readonly columns = COLUMNS;
  protected readonly rowId = (row: ChargeRow): string => row.id;

  protected sorted(key: Column): void {
    if (key !== 'action') this.sortBy.emit(key);
  }

  /** «Revisar pago» is primary; the other two are secondary; «Ver huésped» is a link. In a row they are 40 px. */
  protected actionClass(row: ChargeRow, inRow = false): string {
    const kind = { primary: 'primary', secondary: 'secondary', link: 'tertiary' }[row.action.kind];
    return `quipu-button quipu-button--${kind}${inRow && kind !== 'tertiary' ? ' quipu-button--row' : ''}`;
  }
}
