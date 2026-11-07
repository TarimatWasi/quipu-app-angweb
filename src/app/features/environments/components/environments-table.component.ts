import { Component, input, output, TemplateRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataCardDirective } from '@shared/ui/data-table/data-card.directive';
import { DataCellDirective } from '@shared/ui/data-table/data-cell.directive';
import { DataSkeletonCardDirective } from '@shared/ui/data-table/data-skeleton-card.directive';
import { DataTableComponent } from '@shared/ui/data-table/data-table.component';
import type { DataColumn } from '@shared/ui/data-table/data-table.component';
import { StatusBadgeComponent } from '@shared/ui/status-badge/status-badge.component';
import { SkeletonBlockComponent } from '@shared/ui/skeleton/skeleton-block.component';
import type { EnvironmentRow, EnvironmentSort, SortKey } from '../model/environment';

type Column = SortKey | 'action';

const COLUMNS: readonly DataColumn<Column>[] = [
  { key: 'code', label: 'Ambiente', sortable: true, rowHeader: true, skeleton: { width: '4rem' } },
  { key: 'type', label: 'Tipo', sortable: true },
  { key: 'occupancy', label: 'Ocupación', sortable: true },
  { key: 'status', label: 'Estado', sortable: true, skeleton: { shape: 'badge' } },
  {
    key: 'action',
    label: 'Acciones',
    hiddenLabel: true,
    align: 'action',
    skeleton: { width: '8rem' },
  },
];

/**
 * A2 «Todos los ambientes» on `app-data-table`: what each column says, «Editar» and the change of
 * state of its row, and its card on a phone. The page filters and sorts: a header only emits its column.
 */
@Component({
  selector: 'app-environments-table',
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
      caption="Ambientes"
      [loading]="loading()"
      [skeletonBefore]="skeletonBefore()"
      [columns]="columns"
      [rows]="rows()"
      [rowId]="rowId"
      [sort]="sort()"
      (sortBy)="sorted($event)"
    >
      <ng-template appDataSkeletonCard>
        <app-skeleton-block width="40%" height="1.25rem" /><app-skeleton-block width="70%" />
      </ng-template>
      <ng-template appDataCell="code" [appDataCellRows]="rows()" let-row
        ><strong class="quipu-name">{{ row.code }}</strong></ng-template
      >
      <ng-template appDataCell="type" [appDataCellRows]="rows()" let-row>{{
        row.typeLabel
      }}</ng-template>
      <ng-template appDataCell="occupancy" [appDataCellRows]="rows()" let-row>
        {{ row.occupancyTitle }}
        @if (row.occupancyDetail) {
          <span class="detail">{{ row.occupancyDetail }}</span>
        }
      </ng-template>
      <ng-template appDataCell="status" [appDataCellRows]="rows()" let-row>
        <app-status-badge [tone]="row.badge.tone" [label]="row.badge.label" />
      </ng-template>
      <ng-template appDataCell="action" [appDataCellRows]="rows()" let-row>
        <span class="actions">
          <a [routerLink]="['/admin/environments', row.id, 'edit']" [attr.aria-label]="row.editName"
            >Editar</a
          >
          <button
            class="quipu-button quipu-button--tertiary"
            type="button"
            [attr.aria-label]="row.actionName"
            (click)="changeState.emit(row)"
          >
            {{ row.actionLabel }}
          </button>
        </span>
      </ng-template>

      <ng-template appDataCard [appDataCardRows]="rows()" let-row>
        <div class="card-head">
          <div class="card-who">
            <strong class="quipu-name">{{ row.code }}</strong>
            <span class="detail">{{ row.typeLabel }}</span>
          </div>
          <app-status-badge [tone]="row.badge.tone" [label]="row.badge.label" />
        </div>
        <p>
          {{ row.occupancyTitle }}
          @if (row.occupancyDetail) {
            <span class="inline-detail">{{ row.occupancyDetail }}</span>
          }
        </p>
        <span class="actions">
          <a [routerLink]="['/admin/environments', row.id, 'edit']" [attr.aria-label]="row.editName"
            >Editar</a
          >
          <button
            class="quipu-button quipu-button--tertiary"
            type="button"
            [attr.aria-label]="row.actionName"
            (click)="changeState.emit(row)"
          >
            {{ row.actionLabel }}
          </button>
        </span>
      </ng-template>
    </app-data-table>
  `,
  // The table, its headers, the cards, the badges and the links are the kit's; here only what the
  // content of the cells of A2 needs.
  styles: `
    :host {
      display: block;
      --quipu-tabla-ancho-minimo: 860px;
    }
    .detail {
      display: block;
      font: var(--mat-sys-body-small);
      color: var(--quipu-tinta-secundaria);
    }
    .inline-detail {
      font: var(--mat-sys-body-small);
      color: var(--quipu-tinta-secundaria);
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
export class EnvironmentsTableComponent {
  readonly loading = input(false);
  readonly skeletonBefore = input<TemplateRef<unknown> | null>(null);
  readonly rows = input.required<readonly EnvironmentRow[]>();
  readonly sort = input.required<EnvironmentSort>();
  /** A sortable header was pressed. */
  readonly sortBy = output<SortKey>();
  /** «Desactivar» or «Reactivar» of a row was pressed. */
  readonly changeState = output<EnvironmentRow>();

  protected readonly columns = COLUMNS;
  protected readonly rowId = (row: EnvironmentRow): string => row.id;

  protected sorted(key: Column): void {
    if (key !== 'action') this.sortBy.emit(key);
  }
}
