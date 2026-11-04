import { Component, computed, inject, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import type { ProofKind } from '../model/proof-kind';
import { formatMoney, parseAmount } from '@shared/payments/payment-format';
import {
  AMOUNT_TEXT,
  INVALID_FILE_TEXT,
  MISSING_FILE_TEXT,
  VOUCHER_MAX_BYTES,
  VOUCHER_TYPES,
} from '@shared/payments/proof-rules';

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

const METHOD_SHORTCUTS = ['Yape', 'Transferencia'] as const;

/**
 * A5.2 "Agregar comprobante": a voucher (file and optional method, with the Yape and Transferencia
 * shortcuts) or cash without a voucher. The amount is the verified one; the help says what is missing.
 */
@Component({
  selector: 'app-add-proof-dialog',
  imports: [MatButton, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose],
  templateUrl: './add-proof-dialog.component.html',
  styles: `
    form {
      display: contents;
    }
    fieldset {
      display: flex;
      gap: 1.5rem;
      margin: 0 0 1rem;
      padding: 0;
      border: 0;
    }
    legend {
      margin-bottom: 0.5rem;
      font-weight: 700;
    }
    .field {
      display: grid;
      gap: 0.25rem;
      margin-bottom: 1rem;
    }
    .field input {
      padding: 0.75rem;
      border: 1px solid var(--mat-sys-outline);
      border-radius: 4px;
      font: inherit;
      background: var(--mat-sys-surface);
    }
    .shortcuts {
      display: flex;
      gap: 0.5rem;
    }
    .help {
      margin: 0;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
    }
    .error {
      margin: 0;
      color: var(--mat-sys-error);
      font: var(--mat-sys-body-small);
    }
  `,
})
export class AddProofDialogComponent {
  private readonly ref = inject<MatDialogRef<AddProofDialogComponent, AddedProof>>(MatDialogRef);
  private readonly data = inject<AddProofDialogData>(MAT_DIALOG_DATA);

  protected readonly shortcuts = METHOD_SHORTCUTS;
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
    this.submitted() && this.parsedAmount() === null ? AMOUNT_TEXT : null,
  );
  protected readonly fileError = computed(() => {
    if (this.kind() !== 'VOUCHER') return null;
    if (this.fileInvalid()) return INVALID_FILE_TEXT;
    return this.submitted() && this.file() === null ? MISSING_FILE_TEXT : null;
  });

  protected choose(kind: ProofKind): void {
    this.kind.set(kind);
  }

  protected typed(target: EventTarget | null, into: 'amount' | 'method'): void {
    const value = target instanceof HTMLInputElement ? target.value : '';
    this[into].set(value);
  }

  protected picked(target: EventTarget | null): void {
    const input = target instanceof HTMLInputElement ? target : null;
    const chosen = input?.files?.[0] ?? null;
    const valid =
      chosen !== null && VOUCHER_TYPES.includes(chosen.type) && chosen.size <= VOUCHER_MAX_BYTES;
    this.fileInvalid.set(chosen !== null && !valid);
    this.file.set(valid ? chosen : null);
    if (input && !valid) {
      input.value = '';
    }
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
