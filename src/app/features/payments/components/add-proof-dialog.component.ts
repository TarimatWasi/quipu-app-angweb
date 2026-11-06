import { ProofKindChoiceComponent } from '@shared/payments/proof-kind-choice.component';
import { ProofAmountFieldComponent } from '@shared/payments/proof-amount-field.component';
import { ProofMethodFieldComponent } from '@shared/payments/proof-method-field.component';
import { proofAmountError, proofFileError } from '@shared/payments/proof-draft';
import { Component, computed, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DialogFrameComponent } from '@shared/ui/dialog-frame/dialog-frame.component';
import { FileFieldComponent } from '@shared/ui/file-field/file-field.component';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';
import type { ProofKind } from '../model/proof-kind';
import { formatMoney, parseAmount } from '@shared/payments/payment-format';
import { isValidVoucher } from '@shared/payments/proof-rules';

export interface AddProofDialogData {
  /** What is still missing to cover what is due; 0 when nothing is missing. */
  readonly missing: number;
}

/** What the administrator adds; the page sends it with the rest of the proofs. */
export interface AddedProof {
  readonly kind: ProofKind;
  readonly amount: number;
  readonly method?: string;
  readonly file?: File;
}

/**
 * A5.2 "Agregar comprobante": a voucher (file and optional method, with the Yape and Transferencia
 * shortcuts) or cash without a voucher. The amount is the verified one; the help says what is missing.
 */
@Component({
  selector: 'app-add-proof-dialog',
  imports: [
    DialogFrameComponent,
    ProofKindChoiceComponent,
    ProofAmountFieldComponent,
    ProofMethodFieldComponent,
    FileFieldComponent,
    FormFieldComponent,
  ],
  templateUrl: './add-proof-dialog.component.html',
  styles: `
    .body {
      display: grid;
      gap: 1.25rem;
    }
    .lead,
    .note {
      margin: 0;
      color: var(--quipu-tinta-secundaria);
    }
    .amount {
      max-width: 15rem;
    }
  `,
})
export class AddProofDialogComponent {
  private readonly ref = inject<MatDialogRef<AddProofDialogComponent, AddedProof>>(MatDialogRef);
  private readonly data = inject<AddProofDialogData>(MAT_DIALOG_DATA);

  protected readonly kind = signal<ProofKind>('VOUCHER');
  protected readonly amount = signal('');
  protected readonly method = signal('');
  protected readonly file = signal<File | null>(null);
  protected readonly fileInvalid = signal(false);
  protected readonly submitted = signal(false);

  protected readonly help =
    this.data.missing > 0
      ? `Faltan ${formatMoney(this.data.missing)} para cubrir lo que corresponde.`
      : 'Lo verificado ya cubre lo que corresponde.';

  private readonly parsedAmount = computed(() => {
    const value = parseAmount(this.amount());
    return value !== null && value > 0 ? value : null;
  });
  protected readonly amountError = computed(() =>
    proofAmountError(this.amount(), this.submitted()),
  );
  protected readonly fileError = computed(() =>
    proofFileError(
      {
        kind: this.kind(),
        file: this.file(),
        fileInvalid: this.fileInvalid(),
      },
      this.submitted(),
    ),
  );

  protected choose(kind: ProofKind): void {
    this.kind.set(kind);
  }

  protected picked(chosen: File | null): void {
    const valid = chosen !== null && isValidVoucher(chosen);
    this.fileInvalid.set(chosen !== null && !valid);
    this.file.set(valid ? chosen : null);
  }

  protected cancel(): void {
    this.ref.close();
  }

  protected submit(event: Event): void {
    event.preventDefault();
    this.submitted.set(true);
    const amount = this.parsedAmount();
    if (amount === null || this.fileError() !== null) return;
    const file = this.file();
    if (this.kind() === 'CASH' || file === null) {
      this.ref.close({ kind: 'CASH', amount });
      return;
    }
    const method = this.method().trim();
    this.ref.close({ kind: 'VOUCHER', amount, file, ...(method ? { method } : {}) });
  }
}

export function openAddProofDialog(
  dialog: MatDialog,
  data: AddProofDialogData,
): MatDialogRef<AddProofDialogComponent, AddedProof> {
  return dialog.open<AddProofDialogComponent, AddProofDialogData, AddedProof>(
    AddProofDialogComponent,
    { data, maxWidth: 'calc(100vw - 2rem)', width: '32rem' },
  );
}
