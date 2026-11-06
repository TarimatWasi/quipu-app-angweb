import { SkeletonBlockComponent } from '@shared/ui/skeleton/skeleton-block.component';
import { DataSkeletonCardDirective } from '@shared/ui/data-table/data-skeleton-card.directive';
import { DataSkeletonCellDirective } from '@shared/ui/data-table/data-skeleton-cell.directive';
import { TemplateRef } from '@angular/core';
import { Component, input, output } from '@angular/core';
import { DataCardDirective } from '@shared/ui/data-table/data-card.directive';
import { DataCellDirective } from '@shared/ui/data-table/data-cell.directive';
import { DataTableComponent } from '@shared/ui/data-table/data-table.component';
import type { DataColumn } from '@shared/ui/data-table/data-table.component';
import { StatusBadgeComponent } from '@shared/ui/status-badge/status-badge.component';
import type { AdministratorRow } from '../model/administrator';

const ACTION_LABELS = { deactivate: 'Desactivar', reactivate: 'Reactivar' } as const;

const COLUMNS: readonly DataColumn[] = [
  { key: 'name', label: 'Nombre', rowHeader: true },
  { key: 'document', label: 'Documento' },
  { key: 'email', label: 'Correo de su cuenta' },
  { skeleton: { shape: 'badge' }, key: 'state', label: 'Estado' },
  { key: 'since', label: 'Desde' },
  {
    skeleton: { width: '7rem' },
    key: 'action',
    label: 'Acción',
    hiddenLabel: true,
    align: 'action',
  },
];

/**
 * A7 «Todos los administradores» on `app-data-table`: a table on a wide screen and one card per
 * administrator on a phone. The own account carries «Tú» and has no action; an account without a
 * name says «Sin activar». The page decides what an action does: here it is only emitted.
 */
@Component({
  selector: 'app-administrators-list',
  imports: [
    SkeletonBlockComponent,
    DataSkeletonCardDirective,
    DataSkeletonCellDirective,
    DataCardDirective,
    DataCellDirective,
    DataTableComponent,
    StatusBadgeComponent,
  ],
  template: `
    <app-data-table
      [loading]="loading()"
      [skeletonBefore]="skeletonBefore()"
      caption="Administradores"
      [columns]="columns"
      [rows]="rows()"
      [rowId]="rowId"
    >
      <ng-template appDataSkeletonCell="name"
        ><app-skeleton-block width="85%" /><app-skeleton-block
          class="skeleton-detail"
          width="65%"
          height="0.75rem"
      /></ng-template>
      <ng-template appDataSkeletonCard
        ><app-skeleton-block width="80%" height="1.25rem" /><app-skeleton-block width="90%" />
        <div class="card-state">
          <app-skeleton-block shape="badge" /><app-skeleton-block width="6rem" />
        </div>
        <app-skeleton-block shape="rectangle"
      /></ng-template>
      <ng-template appDataCell="name" [appDataCellRows]="rows()" let-row>
        @if (row.name; as fullName) {
          <span class="quipu-name">{{ fullName }}</span>
        } @else {
          <span class="quipu-unnamed">Sin activar</span>
        }
        @if (row.self) {
          &ngsp;<span class="you">Tú</span>
        }
      </ng-template>
      <ng-template appDataCell="document" [appDataCellRows]="rows()" let-row>
        <span class="number">{{ row.document }}</span>
      </ng-template>
      <ng-template appDataCell="email" [appDataCellRows]="rows()" let-row>
        <span class="email">{{ row.email }}</span>
      </ng-template>
      <ng-template appDataCell="state" [appDataCellRows]="rows()" let-row>
        <app-status-badge [tone]="row.badge.tone" [label]="row.badge.label" />
      </ng-template>
      <ng-template appDataCell="since" [appDataCellRows]="rows()" let-row>{{
        row.since
      }}</ng-template>
      <ng-template appDataCell="action" [appDataCellRows]="rows()" let-row>
        @if (row.action; as kind) {
          <button
            class="quipu-button quipu-button--secondary quipu-button--row"
            type="button"
            [attr.aria-label]="actionLabels[kind] + ' a ' + row.displayName"
            (click)="act.emit(row)"
          >
            {{ actionLabels[kind] }}
          </button>
        }
      </ng-template>

      <ng-template appDataCard [appDataCardRows]="rows()" let-row>
        <p class="card-name">
          @if (row.name; as fullName) {
            <span class="quipu-name">{{ fullName }}</span>
          } @else {
            <span class="quipu-unnamed">Sin activar</span>
          }
          @if (row.self) {
            &ngsp;<span class="you">Tú</span>
          }
        </p>
        <p class="card-meta">
          <span class="number">{{ row.document }}</span> · {{ row.email }}
        </p>
        <p class="card-state">
          <app-status-badge [tone]="row.badge.tone" [label]="row.badge.label" />
          <span>Desde {{ row.since }}</span>
        </p>
        @if (row.action; as kind) {
          <button
            class="quipu-button quipu-button--secondary quipu-button--row card-action"
            type="button"
            [attr.aria-label]="actionLabels[kind] + ' a ' + row.displayName"
            (click)="act.emit(row)"
          >
            {{ actionLabels[kind] }}
          </button>
        }
      </ng-template>
    </app-data-table>
  `,
  styles: `
    :host {
      display: block;
      --quipu-tabla-ancho-minimo: 860px;
    }
    .skeleton-detail {
      margin-top: 0.375rem;
    }
    .skeleton-who {
      width: 70%;
    }
    .number {
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .email {
      overflow-wrap: anywhere;
    }
    .you {
      display: inline-block;
      margin-left: 0.25rem;
      padding: 0.125rem 0.5rem;
      border-radius: var(--quipu-radio);
      background: var(--quipu-obsidiana);
      color: var(--quipu-alpaca);
      font: var(--mat-sys-label-medium);
    }
    .card-meta {
      color: var(--quipu-tinta-secundaria);
      overflow-wrap: anywhere;
    }
    .card-state {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem 0.75rem;
    }
    .card-action {
      width: 100%;
    }
  `,
})
export class AdministratorsListComponent {
  readonly loading = input(false);
  readonly skeletonBefore = input<TemplateRef<unknown> | null>(null);
  readonly rows = input.required<readonly AdministratorRow[]>();
  /** The action of a row was chosen: «Desactivar» or «Reactivar», as `row.action` says. */
  readonly act = output<AdministratorRow>();

  protected readonly columns = COLUMNS;
  protected readonly actionLabels = ACTION_LABELS;
  protected readonly rowId = (row: AdministratorRow): string => row.id;
}
