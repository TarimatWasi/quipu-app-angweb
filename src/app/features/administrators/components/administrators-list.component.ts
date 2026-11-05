import { Component, input, output } from '@angular/core';
import { StatusBadgeComponent } from '@shared/ui/status-badge/status-badge.component';
import type { AdministratorRow } from '../model/administrator';

const ACTION_LABELS = { deactivate: 'Desactivar', reactivate: 'Reactivar' } as const;

/**
 * A7 «Todos los administradores»: a table on a wide screen and one card per administrator on a
 * phone (only one of them is displayed). The own account carries «Tú» and has no action; an account
 * without a name says «Sin activar». The page decides what an action does: here it is only emitted.
 */
@Component({
  selector: 'app-administrators-list',
  imports: [StatusBadgeComponent],
  template: `
    <div class="wide">
      <table>
        <caption class="cdk-visually-hidden">
          Administradores
        </caption>
        <thead>
          <tr>
            <th scope="col">Nombre</th>
            <th scope="col">Documento</th>
            <th scope="col">Correo de su cuenta</th>
            <th scope="col">Estado</th>
            <th scope="col">Desde</th>
            <th scope="col"><span class="cdk-visually-hidden">Acción</span></th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.id) {
            <tr>
              <th scope="row">
                @if (row.name; as fullName) {
                  <span class="name">{{ fullName }}</span>
                } @else {
                  <span class="unnamed">Sin activar</span>
                }
                @if (row.self) {
                  &ngsp;<span class="you">Tú</span>
                }
              </th>
              <td class="number">{{ row.document }}</td>
              <td class="email">{{ row.email }}</td>
              <td><app-status-badge [tone]="row.badge.tone" [label]="row.badge.label" /></td>
              <td>{{ row.since }}</td>
              <td class="action">
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
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    <ul class="narrow cards" aria-label="Administradores">
      @for (row of rows(); track row.id) {
        <li class="card">
          <p class="card-name">
            @if (row.name; as fullName) {
              <span class="name">{{ fullName }}</span>
            } @else {
              <span class="unnamed">Sin activar</span>
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
              class="quipu-button quipu-button--secondary quipu-button--row"
              type="button"
              [attr.aria-label]="actionLabels[kind] + ' a ' + row.displayName"
              (click)="act.emit(row)"
            >
              {{ actionLabels[kind] }}
            </button>
          }
        </li>
      }
    </ul>
  `,
  // The canvas «Administradores»: rows on alpaca separated by 3 px of the page's stone, the header
  // row on dark stone; on a phone, alpaca cards 3 px apart. No line of grey.
  styles: `
    :host {
      display: block;
    }
    .wide {
      overflow-x: auto;
      border-radius: var(--quipu-radio);
    }
    table {
      width: 100%;
      min-width: 860px;
      border-collapse: collapse;
      background: var(--quipu-alpaca);
    }
    th,
    td {
      padding: var(--quipu-relleno-celda);
      text-align: left;
      vertical-align: middle;
    }
    thead tr {
      background: var(--quipu-piedra-oscura);
    }
    thead th {
      font-size: var(--mat-sys-body-medium-size);
      font-weight: var(--quipu-peso-fuerte);
      color: var(--quipu-tinta);
    }
    tbody tr {
      border-top: var(--quipu-franja) solid var(--quipu-piedra);
    }
    tbody tr:hover {
      background: var(--quipu-hover-fila);
    }
    tbody th {
      font-weight: normal;
    }
    .number {
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .email {
      overflow-wrap: anywhere;
    }
    .action {
      text-align: right;
    }
    .name {
      font-weight: var(--quipu-peso-enfasis);
    }
    .unnamed {
      font-style: italic;
      color: var(--quipu-tinta-secundaria);
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
    .cards {
      display: grid;
      gap: var(--quipu-franja);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .card {
      display: grid;
      gap: 0.5rem;
      padding: var(--quipu-relleno-tarjeta);
      border-radius: var(--quipu-radio);
      background: var(--quipu-alpaca);
    }
    .card p {
      margin: 0;
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
    .card button {
      width: 100%;
    }
    .narrow {
      display: none;
    }
    @media (max-width: 599.98px) {
      .wide {
        display: none;
      }
      .narrow {
        display: grid;
      }
    }
  `,
})
export class AdministratorsListComponent {
  readonly rows = input.required<readonly AdministratorRow[]>();
  /** The action of a row was chosen: «Desactivar» or «Reactivar», as `row.action` says. */
  readonly act = output<AdministratorRow>();

  protected readonly actionLabels = ACTION_LABELS;
}
