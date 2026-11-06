import { NgOptimizedImage } from '@angular/common';
import { Component, computed, input, linkedSignal, output } from '@angular/core';
import type { ProofEntry } from '../model/payment-review';

/**
 * A5.2 «Comprobantes»: one button per proof to pick it, the viewer of the one picked (the image,
 * the PDF to download, the cash or a file that cannot be shown), who added it, and «Girar» and
 * «Descargar» for a voucher. «Agregar comprobante» is emitted to the page, which opens its dialog.
 */
@Component({
  selector: 'app-review-proofs',
  imports: [NgOptimizedImage],
  templateUrl: './review-proofs.component.html',
  styleUrl: './review-proofs.component.scss',
})
export class ReviewProofsComponent {
  readonly entries = input.required<readonly ProofEntry[]>();
  /** Whether proofs can still be added (pending or rejected, not decided on this visit). */
  readonly canAdd = input(false);
  /** At the maximum of proofs of a payment (RN-22). */
  readonly full = input(false);
  readonly maxProofs = input.required<number>();
  readonly busy = input(false);
  /** «Agregar comprobante» was pressed. */
  readonly add = output();

  /** The picked proof; the first one again when the list changes (another payment, a proof added). */
  protected readonly selectedId = linkedSignal(() => this.entries()[0]?.id ?? null);
  protected readonly selected = computed(
    () => this.entries().find((entry) => entry.id === this.selectedId()) ?? null,
  );
  /** Quarter turns of the image, back to none when another proof is picked. */
  protected readonly turns = linkedSignal({
    source: this.selectedId,
    computation: () => 0,
  });
  protected readonly imageName = computed(() => {
    const entry = this.selected();
    return entry
      ? `${entry.title}, ${entry.declared}${entry.method ? `, ${entry.method}` : ''}`
      : '';
  });

  protected pick(entry: ProofEntry): void {
    this.selectedId.set(entry.id);
  }

  protected rotate(): void {
    this.turns.update((turns) => (turns + 1) % 4);
  }
}
