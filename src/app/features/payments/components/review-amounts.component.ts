import { Component, input, output } from '@angular/core';
import { DataCellDirective } from '@shared/ui/data-table/data-cell.directive';
import { DataFooterDirective } from '@shared/ui/data-table/data-footer.directive';
import { DataTableComponent } from '@shared/ui/data-table/data-table.component';
import type { DataColumn } from '@shared/ui/data-table/data-table.component';
import type { ProofEntry } from '../model/payment-review';

/** A verified amount typed in a row of «Montos». */
export interface TypedAmount {
  readonly id: string;
  readonly text: string;
}

const COLUMNS: readonly DataColumn[] = [
  { key: 'proof', label: 'Comprobante', rowHeader: true },
  { key: 'declared', label: 'Declarado', align: 'end' },
  { key: 'verified', label: 'Verificado', align: 'end' },
];

/**
 * A5.2 «Montos»: each proof with what was declared and what the administration verifies, and the
 * totals. While the payment can be decided the verified amounts are fields; after, only figures.
 */
@Component({
  selector: 'app-review-amounts',
  imports: [DataCellDirective, DataFooterDirective, DataTableComponent],
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

  protected readonly columns = COLUMNS;
  protected readonly rowId = (entry: ProofEntry): string => entry.id;

  protected type(id: string, target: EventTarget | null): void {
    this.typed.emit({ id, text: target instanceof HTMLInputElement ? target.value : '' });
  }
}
