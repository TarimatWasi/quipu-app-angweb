import { SortableListTable } from '@shared/ui/data-table/list-table';
import { Component, computed, input, output } from '@angular/core';
import { DataCardDirective } from '@shared/ui/data-table/data-card.directive';
import { DataCellDirective } from '@shared/ui/data-table/data-cell.directive';
import { DataSkeletonCardDirective } from '@shared/ui/data-table/data-skeleton-card.directive';
import { DataTableComponent } from '@shared/ui/data-table/data-table.component';
import type { DataColumn } from '@shared/ui/data-table/data-table.component';
import { SkeletonBlockComponent } from '@shared/ui/skeleton/skeleton-block.component';
import { FIRST_COLUMN, MIDDLE_COLUMN } from '../model/finance';
import type { MovementRow, SortKey, Tab } from '../model/finance';

type Column = SortKey | 'middle' | 'action';

function columnsOf(tab: Tab): readonly DataColumn<Column>[] {
  return [
    { key: 'title', label: FIRST_COLUMN[tab], sortable: true, rowHeader: true, grow: 3 },
    { key: 'middle', label: MIDDLE_COLUMN[tab], grow: 2 },
    { key: 'amount', label: 'Monto', sortable: true, align: 'end' },
    { key: 'action', label: 'Acción', hiddenLabel: true, align: 'action' },
  ];
}

/**
 * A6 «Movimientos del mes» on `app-data-table`: the expenses, the fines or the refunds of the month
 * with «Editar» and «Eliminar» where the row allows them, and its card on a phone. The page sorts:
 * a header only emits its column.
 */
@Component({
  selector: 'app-movements-table',
  imports: [
    DataCardDirective,
    DataCellDirective,
    DataSkeletonCardDirective,
    DataTableComponent,
    SkeletonBlockComponent,
  ],
  template: `
    <app-data-table
      [caption]="caption()"
      [loading]="loading()"
      [skeletonBefore]="skeletonBefore()"
      [columns]="columns()"
      [rows]="rows()"
      [rowId]="rowId"
      [sort]="sort()"
      (sortBy)="sorted($event)"
    >
      <ng-template appDataSkeletonCard>
        <app-skeleton-block width="55%" height="1.25rem" /><app-skeleton-block width="75%" />
      </ng-template>
      <ng-template appDataCell="title" [appDataCellRows]="rows()" let-row>
        <strong class="quipu-name">{{ row.title }}</strong>
        @if (row.sub) {
          <span class="detail">{{ row.sub }}</span>
        }
      </ng-template>
      <ng-template appDataCell="middle" [appDataCellRows]="rows()" let-row>{{
        row.middle
      }}</ng-template>
      <ng-template appDataCell="amount" [appDataCellRows]="rows()" let-row>
        <span class="figures">{{ row.amount }}</span>
      </ng-template>
      <ng-template appDataCell="action" [appDataCellRows]="rows()" let-row>
        <span class="actions">
          @if (row.editable) {
            <button
              class="quipu-button quipu-button--tertiary"
              type="button"
              [attr.aria-label]="'Editar ' + row.name"
              (click)="edit.emit(row)"
            >
              Editar
            </button>
          }
          @if (row.deletable) {
            <button
              class="quipu-button quipu-button--tertiary"
              type="button"
              [attr.aria-label]="'Eliminar ' + row.name"
              (click)="remove.emit(row)"
            >
              Eliminar
            </button>
          }
        </span>
      </ng-template>

      <ng-template appDataCard [appDataCardRows]="rows()" let-row>
        <div class="card-head">
          <div class="card-who">
            <strong class="quipu-name">{{ row.title }}</strong>
            @if (row.sub) {
              <span class="detail">{{ row.sub }}</span>
            }
          </div>
          <span class="figures">{{ row.amount }}</span>
        </div>
        <span class="detail">{{ row.middle }}</span>
        <span class="actions">
          @if (row.editable) {
            <button
              class="quipu-button quipu-button--tertiary"
              type="button"
              [attr.aria-label]="'Editar ' + row.name"
              (click)="edit.emit(row)"
            >
              Editar
            </button>
          }
          @if (row.deletable) {
            <button
              class="quipu-button quipu-button--tertiary"
              type="button"
              [attr.aria-label]="'Eliminar ' + row.name"
              (click)="remove.emit(row)"
            >
              Eliminar
            </button>
          }
        </span>
      </ng-template>
    </app-data-table>
  `,
  // The table, its headers, the cards and the buttons are the kit's; here only what the cells need.
  styles: `
    :host {
      display: block;
      --quipu-tabla-ancho-minimo: 720px;
    }
    .detail {
      display: block;
      font: var(--mat-sys-body-small);
      color: var(--quipu-tinta-secundaria);
    }
    .figures {
      font-variant-numeric: tabular-nums;
    }
    .actions {
      display: inline-flex;
      align-items: center;
      gap: 1.25rem;
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
    }
  `,
})
export class MovementsTableComponent extends SortableListTable<MovementRow, SortKey, Column> {
  readonly tab = input.required<Tab>();
  /** «Editar» of an expense. */
  readonly edit = output<MovementRow>();
  /** «Eliminar» of an expense or a fine. */
  readonly remove = output<MovementRow>();

  protected readonly rowId = (row: MovementRow): string => row.key;

  protected readonly caption = computed(
    () => `Movimientos: ${FIRST_COLUMN[this.tab()].toLowerCase()}`,
  );
  protected readonly columns = computed(() => columnsOf(this.tab()));
}
