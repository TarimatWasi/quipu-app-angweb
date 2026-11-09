import { computed, signal } from '@angular/core';
import { parseAmount } from './payment-format';
import { proofAmountError, proofFileError } from './proof-fields';
import type { ProofDraft, SavedProof } from './proof-fields';
import { isValidVoucher, MAX_PROOFS } from './proof-rules';

/** Local editor state. Requests, server errors and navigation belong to the owning page. */
export class ProofDrafts {
  private nextKey = 1;
  readonly drafts = signal<readonly ProofDraft[]>([this.create()]);
  readonly atLimit = computed(() => this.drafts().length >= MAX_PROOFS);
  readonly sum = computed(() =>
    this.drafts().reduce((total, draft) => total + (parseAmount(draft.amount) ?? 0), 0),
  );

  add(): boolean {
    if (this.atLimit()) return false;
    this.drafts.update((drafts) => [...drafts, this.create()]);
    return true;
  }

  remove(index: number): boolean {
    if (this.drafts().length <= 1 || !this.drafts()[index]) return false;
    this.drafts.update((drafts) => drafts.filter((_, i) => i !== index));
    return true;
  }

  update(index: number, changes: Partial<Omit<ProofDraft, 'key' | 'id'>>): void {
    this.drafts.update((drafts) =>
      drafts.map((draft, i) => (i === index ? { ...draft, ...changes } : draft)),
    );
  }

  chooseFile(index: number, file: File | null): void {
    const valid = file !== null && isValidVoucher(file);
    this.update(index, { file: valid ? file : null, fileInvalid: file !== null && !valid });
  }

  amountError(index: number, submitted: boolean, text?: string): string | null {
    return proofAmountError(this.drafts()[index]?.amount ?? '', submitted, text);
  }

  fileError(index: number, submitted: boolean): string | null {
    const draft = this.drafts()[index];
    return draft ? proofFileError(draft, submitted) : null;
  }

  /** A correction keeps the original proof ids and files; row keys never repeat after a reload. */
  reset(saved: readonly SavedProof[] = []): void {
    const drafts = saved.slice(0, MAX_PROOFS).map((proof): ProofDraft => ({
      ...this.create(),
      id: proof.id,
      kind: proof.kind,
      amount: String(proof.declaredAmount),
      method: proof.method ?? '',
      keptFile: proof.kind === 'VOUCHER' ? (proof.file?.name ?? null) : null,
    }));
    this.drafts.set(drafts.length > 0 ? drafts : [this.create()]);
  }

  private create(): ProofDraft {
    return {
      key: this.nextKey++,
      id: null,
      kind: 'VOUCHER',
      amount: '',
      method: '',
      file: null,
      keptFile: null,
      fileInvalid: false,
    };
  }
}
