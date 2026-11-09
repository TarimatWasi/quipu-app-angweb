import { Component, input } from '@angular/core';
import { FactTileComponent } from '@shared/ui/fact-tile/fact-tile.component';
import type { PaymentSummary } from '../model/own-payment';
import { SkeletonFactsComponent } from '@shared/ui/skeleton/skeleton-facts.component';

/**
 * «Lo que estás pagando» on the canvas «Voucher»: the facts of the month or the stay beside the
 * form, and under them what the proofs are for. While it loads it is the facts as a skeleton, with
 * the title in its place.
 */
@Component({
  selector: 'app-own-payment-summary',
  imports: [FactTileComponent, SkeletonFactsComponent],
  template: `
    <h2 id="own-payment-summary">Lo que estás pagando</h2>
    @if (summary(); as data) {
      <div class="facts">
        <app-fact-tile surface="stone" [label]="data.label" [value]="data.value" />
        <div class="pair" [class.single]="data.due === null">
          <app-fact-tile surface="stone" [label]="data.amountLabel" [value]="data.amount" />
          @if (data.due; as due) {
            <app-fact-tile surface="stone" label="Vence" [value]="due" />
          }
        </div>
      </div>
      <p class="note">{{ data.note }}</p>
    } @else {
      <app-skeleton-facts [labels]="['Mes', 'Cuota', 'Vence']" />
    }
  `,
  styles: `
    :host {
      display: block;
      --quipu-cifra-ficha: var(--quipu-cifra-resumen);
    }
    h2 {
      margin: 0 0 0.875rem;
      font-size: 1.25rem;
      font-weight: var(--quipu-peso-fuerte);
    }
    .facts,
    .pair {
      display: grid;
      gap: var(--quipu-franja);
    }
    .pair {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .pair.single {
      grid-template-columns: 1fr;
    }
    .note {
      margin: 0.875rem 0 0;
      font: var(--mat-sys-body-medium);
      line-height: 1.5;
      color: var(--quipu-tinta-secundaria);
    }
  `,
})
export class OwnPaymentSummaryComponent {
  readonly summary = input<PaymentSummary | null>(null);
}
