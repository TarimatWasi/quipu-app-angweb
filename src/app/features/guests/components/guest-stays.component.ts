import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { StatusBadgeComponent } from '@shared/ui/status-badge/status-badge.component';
import type { StayRow } from '../model/stay-rows';

/**
 * A3.2 «Estadías» of a temporary guest (RN-13): one card per stay, newest first, with its dates,
 * environment and nights, the agreed amount, the state of its single payment (RN-03) and what to
 * do with it, and «Corregir estadía» (A3.5). An active guest can take a new stay; an inactive one
 * keeps its history. The page reads the whole history, so what is owed is never left out.
 */
@Component({
  selector: 'app-guest-stays',
  imports: [EmptyStateComponent, RouterLink, StatusBadgeComponent],
  template: `
    <section class="section" aria-labelledby="stays-title">
      <div class="section-head">
        <h2 id="stays-title">Estadías</h2>
        @if (canRegister()) {
          <a
            class="quipu-button quipu-button--secondary"
            [routerLink]="['/admin/guests', guestId(), 'stays', 'new']"
            >Registrar estadía</a
          >
        }
      </div>

      @if (rows().length > 0) {
        <ul class="quipu-card-list stays" aria-label="Estadías">
          @for (stay of rows(); track stay.id) {
            <li class="quipu-card">
              <div class="when">
                <strong>{{ stay.dates }}</strong>
                <span class="sub">{{ stay.sub }}</span>
              </div>
              <span class="amount">{{ stay.amount }}</span>
              <app-status-badge [tone]="stay.badge.tone" [label]="stay.badge.label" />
              <span class="acts">
                @if (stay.payment; as payment) {
                  <a [routerLink]="payment.link" [queryParams]="payment.query"
                    >{{ payment.label
                    }}<span class="cdk-visually-hidden">
                      de la estadía del {{ stay.dates }}</span
                    ></a
                  >
                }
                <a [routerLink]="['/admin/guests', guestId(), 'stays', stay.id]"
                  >Corregir estadía<span class="cdk-visually-hidden"> del {{ stay.dates }}</span></a
                >
              </span>
            </li>
          }
        </ul>
      } @else {
        <app-empty-state heading="Aún no tiene estadías registradas." />
      }

      <p class="note">De la más reciente a la más antigua. Cada estadía tiene un solo pago.</p>
    </section>
  `,
  // Cards, badges, buttons and notices are the kit's; here only places and gaps.
  styles: `
    :host {
      display: block;
    }
    .section {
      display: grid;
      gap: 1rem;
    }
    .section-head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem 1.5rem;
    }
    h2,
    p {
      margin: 0;
    }
    .stays li {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.625rem 1.25rem;
    }
    .when {
      display: grid;
      flex: 1 1 13.75rem;
      gap: 0.125rem;
      min-width: 0;
    }
    .when strong {
      font-size: var(--quipu-texto-intro-size);
    }
    .sub {
      font: var(--mat-sys-body-small);
      color: var(--quipu-tinta-secundaria);
    }
    .amount {
      font-weight: var(--quipu-peso-enfasis);
      font-variant-numeric: tabular-nums;
    }
    .acts {
      display: flex;
      flex-wrap: wrap;
      gap: 0 1.25rem;
    }
    .acts a {
      display: inline-flex;
      align-items: center;
      min-height: var(--quipu-toque);
    }
    .note {
      font: var(--mat-sys-body-medium);
      color: var(--quipu-tinta-secundaria);
    }
  `,
})
export class GuestStaysComponent {
  readonly guestId = input.required<string>();
  readonly rows = input.required<readonly StayRow[]>();
  /** Only an active guest takes a new stay (RN-35). */
  readonly canRegister = input.required<boolean>();
}
