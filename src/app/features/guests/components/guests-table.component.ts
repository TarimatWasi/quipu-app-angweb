import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StatusBadgeComponent } from '@shared/ui/status-badge/status-badge.component';
import type { GuestRow, GuestSort, SortKey } from '../model/guest-list';

const COLUMNS: readonly { readonly key: SortKey; readonly label: string }[] = [
  { key: 'guest', label: 'Huésped' },
  { key: 'type', label: 'Tipo' },
  { key: 'environment', label: 'Ambiente' },
  { key: 'status', label: 'Estado' },
];

/**
 * A3 «Todos los huéspedes»: a table with sortable headers on a wide screen and one card per guest
 * on a phone (only one of them is displayed). The page sorts: a header only emits its column.
 */
@Component({
  selector: 'app-guests-table',
  imports: [RouterLink, StatusBadgeComponent],
  template: `
    <div class="quipu-table-wrap quipu-only-wide">
      <table class="quipu-table">
        <caption class="cdk-visually-hidden">
          Huéspedes
        </caption>
        <thead>
          <tr>
            @for (column of columns; track column.key) {
              <th scope="col" [attr.aria-sort]="ariaSort(column.key)">
                <button
                  class="sort"
                  type="button"
                  [class.active]="sort().key === column.key"
                  (click)="sortBy.emit(column.key)"
                >
                  {{ column.label }}
                  <svg
                    class="arrow"
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
          @for (row of rows(); track row.id) {
            <tr>
              <th scope="row">
                @if (row.name; as fullName) {
                  <span class="quipu-name">{{ fullName }}</span>
                } @else {
                  <span class="quipu-unnamed">Sin nombre</span>
                }
                <span class="detail number">{{ row.document }}</span>
              </th>
              <td>{{ row.type }}</td>
              <td>
                {{ row.environment.main }}
                @if (row.environment.detail; as detail) {
                  <span class="detail">{{ detail }}</span>
                }
              </td>
              <td>
                <app-status-badge [tone]="row.badge.tone" [label]="row.badge.label" />
                @if (row.access; as access) {
                  <span class="detail access" [class.expired]="access.expired">{{
                    access.text
                  }}</span>
                }
              </td>
              <td class="action">
                <a [routerLink]="['/admin/guests', row.id]" [attr.aria-label]="seeLabel(row)"
                  >Ver huésped</a
                >
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    <ul class="quipu-card-list quipu-only-narrow" aria-label="Huéspedes">
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
          <a [routerLink]="['/admin/guests', row.id]" [attr.aria-label]="seeLabel(row)"
            >Ver huésped</a
          >
        </li>
      }
    </ul>
  `,
  // The table, the cards and the names are the kit's (styles.scss); here only what A3 adds.
  styles: `
    :host {
      display: block;
    }
    table {
      min-width: 900px;
    }
    .sort {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0;
      border: 0;
      background: none;
      color: var(--quipu-tinta-secundaria);
      font: inherit;
      cursor: pointer;
    }
    .sort.active {
      color: var(--quipu-tinta);
    }
    .arrow {
      flex: none;
      transition: transform var(--quipu-duracion-hover) var(--quipu-ease);
    }
    .sort:not(.active) .arrow {
      opacity: var(--quipu-opacidad-inactivo);
    }
    .arrow.down {
      transform: rotate(180deg);
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
    .number {
      font-variant-numeric: tabular-nums;
    }
    td .access {
      margin-top: 0.375rem;
    }
    .access.expired {
      font-weight: var(--quipu-peso-enfasis);
      color: var(--quipu-error);
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
    @media (prefers-reduced-motion: reduce) {
      .arrow {
        transition: none;
      }
    }
  `,
})
export class GuestsTableComponent {
  readonly rows = input.required<readonly GuestRow[]>();
  readonly sort = input.required<GuestSort>();
  /** A sortable header was pressed. */
  readonly sortBy = output<SortKey>();

  protected readonly columns = COLUMNS;

  protected ariaSort(key: SortKey): 'ascending' | 'descending' | null {
    if (this.sort().key !== key) return null;
    return this.sort().direction === 'asc' ? 'ascending' : 'descending';
  }

  /** «Ver huésped» says whom it opens: the name, or the document while it has none. */
  protected seeLabel(row: GuestRow): string {
    return `Ver huésped ${row.name ?? row.document}`;
  }
}
