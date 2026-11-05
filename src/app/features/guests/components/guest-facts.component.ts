import { Component, computed, input } from '@angular/core';
import { FactTileComponent } from '@shared/ui/fact-tile/fact-tile.component';
import { StatusBadgeComponent } from '@shared/ui/status-badge/status-badge.component';
import { StepListComponent } from '@shared/ui/step-list/step-list.component';
import {
  contractFacts,
  contractStatusBadge,
  contractTitle,
  dataFacts,
  dataNote,
  guestStatusBadge,
  onboardingSteps,
} from '../model/detail-side';
import type { GuestDetail } from '../model/detail-side';

/**
 * The facts of A3.2 (P-11 on dark stone): «Sus datos», the contract in force or the last one, and
 * «Su registro» (P-25) while the guest has not finished it. A value longer than 18 characters goes
 * one step smaller, so it never overflows its tile.
 */
@Component({
  selector: 'app-guest-facts',
  imports: [FactTileComponent, StatusBadgeComponent, StepListComponent],
  template: `
    <section class="block" aria-labelledby="data-title">
      <h2 id="data-title">Sus datos</h2>
      <div class="facts">
        @for (fact of data().before; track fact.label) {
          <app-fact-tile
            surface="stone"
            [class.wide]="fact.wide"
            [class.long]="fact.long"
            [label]="fact.label"
            [value]="fact.value"
          />
        }
        <app-fact-tile surface="stone" class="badge" label="Estado">
          <app-status-badge [tone]="status().tone" [label]="status().label" />
        </app-fact-tile>
        @for (fact of data().after; track fact.label) {
          <app-fact-tile
            surface="stone"
            [class.wide]="fact.wide"
            [class.long]="fact.long"
            [label]="fact.label"
            [value]="fact.value"
          />
        }
      </div>
      <p class="note">{{ note() }}</p>
    </section>

    @if (guest().contract; as contract) {
      <section class="block" aria-labelledby="contract-title">
        <h2 id="contract-title">{{ contractHeading() }}</h2>
        <div class="facts">
          @for (fact of contractData().before; track fact.label) {
            <app-fact-tile
              surface="stone"
              [class.wide]="fact.wide"
              [class.long]="fact.long"
              [label]="fact.label"
              [value]="fact.value"
            />
          }
          <app-fact-tile surface="stone" class="badge" label="Estado">
            <app-status-badge
              [tone]="contractStatus(contract).tone"
              [label]="contractStatus(contract).label"
            />
          </app-fact-tile>
          @for (fact of contractData().after; track fact.label) {
            <app-fact-tile
              surface="stone"
              [class.wide]="fact.wide"
              [class.long]="fact.long"
              [label]="fact.label"
              [value]="fact.value"
            />
          }
        </div>
        <!-- TODO(TAR-211): «Ver contrato» links to the contract once the contracts screen exists. -->
      </section>
    }

    @if (registering()) {
      <section class="block" aria-labelledby="steps-title">
        <h2 id="steps-title">Su registro</h2>
        <app-step-list label="Pasos de su registro" [steps]="steps()" />
      </section>
    }
  `,
  // Tiles, badges and the list of steps are the kit's; here only the grid and the sizes.
  styles: `
    :host {
      display: grid;
      gap: 2rem;
    }
    .block {
      display: grid;
      gap: 0.875rem;
    }
    h2,
    p {
      margin: 0;
    }
    .facts {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--quipu-franja);
    }
    app-fact-tile {
      --quipu-cifra-ficha: var(--quipu-cifra-resumen);
      --quipu-cifra-ficha-movil: var(--quipu-cifra-resumen-movil);
      overflow-wrap: anywhere;
    }
    app-fact-tile.long {
      --quipu-cifra-ficha: var(--quipu-cifra-larga);
      --quipu-cifra-ficha-movil: var(--quipu-cifra-larga-movil);
    }
    .wide {
      grid-column: 1 / -1;
    }
    .note {
      font: var(--mat-sys-body-medium);
      color: var(--quipu-tinta-secundaria);
    }
  `,
})
export class GuestFactsComponent {
  readonly guest = input.required<GuestDetail>();

  protected readonly data = computed(() => dataFacts(this.guest()));
  protected readonly status = computed(() => guestStatusBadge(this.guest().status));
  protected readonly note = computed(() => dataNote(this.guest()));
  protected readonly contractHeading = computed(() => {
    const contract = this.guest().contract;
    return contract ? contractTitle(contract) : '';
  });
  protected readonly contractStatus = contractStatusBadge;
  protected readonly contractData = computed(() => {
    const contract = this.guest().contract;
    return contract ? contractFacts(contract) : { before: [], after: [] };
  });
  /** Pending activation or in the onboarding: its registration is still under way. */
  protected readonly registering = computed(
    () => this.guest().status === 'PENDING_ACTIVATION' || this.guest().status === 'ONBOARDING',
  );
  protected readonly steps = computed(() => onboardingSteps(this.guest().onboardingProgress));
}
