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
import type { GuestRow, GuestSort, SortKey } from '../model/guest-list';

type Column = SortKey | 'action';

const COLUMNS: readonly DataColumn<Column>[] = [
  { key: 'guest', label: 'Huésped', sortable: true, rowHeader: true },
  { key: 'type', label: 'Tipo', sortable: true },
  { key: 'environment', label: 'Ambiente', sortable: true },
  { skeleton: { shape: 'badge' }, key: 'status', label: 'Estado', sortable: true },
  {
    skeleton: { width: '7rem' },
    key: 'action',
    label: 'Acciones',
    hiddenLabel: true,
    align: 'action',
  },
];

/**
 * A3 «Todos los huéspedes» on `app-data-table`: what each column of a guest says and its card on a
 * phone. The page sorts: a header only emits its column.
 */
@Component({
  selector: 'app-guests-table',
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
      caption="Huéspedes"
      [columns]="columns"
      [rows]="rows()"
      [rowId]="rowId"
      [sort]="sort()"
      (sortBy)="sorted($event)"
    >
      <ng-template appDataSkeletonCell="guest"
        ><app-skeleton-block width="85%" /><app-skeleton-block
          class="skeleton-detail"
          width="65%"
          height="0.75rem"
      /></ng-template>
      <ng-template appDataSkeletonCard
        ><div class="card-head">
          <div class="card-who skeleton-who">
            <app-skeleton-block width="85%" height="1.25rem" /><app-skeleton-block
              width="65%"
              height="0.75rem"
            />
          </div>
          <app-skeleton-block shape="badge" width="7rem" />
        </div>
        <app-skeleton-block width="45%" /><app-skeleton-block width="7rem"
      /></ng-template>
      <ng-template appDataCell="guest" [appDataCellRows]="rows()" let-row>
        @if (row.name; as fullName) {
          <span class="quipu-name">{{ fullName }}</span>
        } @else {
          <span class="quipu-unnamed">Sin nombre</span>
        }
        <span class="detail number">{{ row.document }}</span>
      </ng-template>
      <ng-template appDataCell="type" [appDataCellRows]="rows()" let-row>{{
        row.type
      }}</ng-template>
      <ng-template appDataCell="environment" [appDataCellRows]="rows()" let-row>
        {{ row.environment.main }}
        @if (row.environment.detail; as detail) {
          <span class="detail">{{ detail }}</span>
        }
      </ng-template>
      <ng-template appDataCell="status" [appDataCellRows]="rows()" let-row>
        <app-status-badge [tone]="row.badge.tone" [label]="row.badge.label" />
        @if (row.access; as access) {
          <span class="detail access in-cell" [class.expired]="access.expired">{{
            access.text
          }}</span>
        }
      </ng-template>
      <ng-template appDataCell="action" [appDataCellRows]="rows()" let-row>
        <a [routerLink]="['/admin/guests', row.id]" [attr.aria-label]="row.seeLabel">Ver huésped</a>
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
          <app-status-badge [tone]="row.badge.tone" [label]="row.badge.label" />
        </div>
        <p>
          {{ row.environment.main }}
          @if (row.environment.detail; as detail) {
            <span class="inline-detail">{{ detail }}</span>
          }
        </p>
        @if (row.access; as access) {
          <p class="detail access" [class.expired]="access.expired">{{ access.text }}</p>
        }
        <a [routerLink]="['/admin/guests', row.id]" [attr.aria-label]="row.seeLabel">Ver huésped</a>
      </ng-template>
    </app-data-table>
  `,
  // The table, its sortable headers, the cards and the names are the kit's; here only what the
  // content of A3's cells needs.
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
    .inline-detail {
      font: var(--mat-sys-body-small);
      color: var(--quipu-tinta-secundaria);
    }
    .skeleton-detail {
      margin-top: 0.375rem;
    }
    .skeleton-who {
      width: 70%;
    }
    .number {
      font-variant-numeric: tabular-nums;
    }
    .in-cell {
      margin-top: 0.375rem;
    }
    .access.expired {
      font-weight: var(--quipu-peso-enfasis);
      color: var(--quipu-error);
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
  `,
})
export class GuestsTableComponent {
  readonly loading = input(false);
  readonly skeletonBefore = input<TemplateRef<unknown> | null>(null);
  readonly rows = input.required<readonly GuestRow[]>();
  readonly sort = input.required<GuestSort>();
  /** A sortable header was pressed. */
  readonly sortBy = output<SortKey>();

  protected readonly columns = COLUMNS;
  protected readonly rowId = (row: GuestRow): string => row.id;

  protected sorted(key: Column): void {
    if (key !== 'action') this.sortBy.emit(key);
  }
}
