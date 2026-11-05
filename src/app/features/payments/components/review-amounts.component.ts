import { Component, input, output } from '@angular/core';
import type { ProofEntry } from '../model/payment-review';

/** A verified amount typed in a row of «Montos». */
export interface TypedAmount {
  readonly id: string;
  readonly text: string;
}

/**
 * A5.2 «Montos»: each proof with what was declared and what the administration verifies, and the
 * totals. While the payment can be decided the verified amounts are fields; after, only figures.
 */
@Component({
  selector: 'app-review-amounts',
  templateUrl: './review-amounts.component.html',
  styleUrl: './review-amounts.component.scss',
})
export class ReviewAmountsComponent {
  readonly entries = input.required<readonly ProofEntry[]>();
  /** The text of each verified amount, by proof id. */
  readonly texts = input.required<Readonly<Record<string, string>>>();
  readonly invalidIds = input.required<ReadonlySet<string>>();
  readonly editable = input(false);
  readonly busy = input(false);
  readonly declaredTotal = input.required<string>();
  readonly verifiedTotal = input.required<string>();
  /** A verified amount was typed. */
  readonly typed = output<TypedAmount>();

  protected type(id: string, target: EventTarget | null): void {
    this.typed.emit({ id, text: target instanceof HTMLInputElement ? target.value : '' });
  }
}
