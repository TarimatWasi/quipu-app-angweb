import { FieldErrors } from '@shared/forms/field-errors';
import { ProofDrafts } from './proof-drafts';
import type { ProofDraft } from './proof-fields';

/** The key of a server error of one row of proofs: `proofs[2].amount`. */
const rowField = (index: number, part: 'amount' | 'file') => `proofs[${String(index)}].${part}`;

/**
 * What a page that sends proofs does with its rows (TAR-326): the drafts, the errors the server
 * gave and what each change of a row does to them. The error of a field holds until its value
 * changes; the errors of a row name it by position, so they no longer hold once a row is removed.
 * Requests, notices and navigation stay with the page (A5.1 direct payment, H3 and T2 own payment).
 */
export class ProofsEditor {
  readonly drafts = new ProofDrafts();
  readonly errors = new FieldErrors();

  /** `submitted` says whether the person already tried to send (the local errors show from then on). */
  constructor(private readonly submitted: () => boolean) {}

  kind(index: number, kind: ProofDraft['kind']): void {
    this.drafts.update(index, { kind });
    // The kind changes what the set asks for (a cash proof carries no file), so its error goes too.
    this.errors.clear(rowField(index, 'file'), 'proofs');
  }

  amount(index: number, amount: string): void {
    this.drafts.update(index, { amount });
    this.errors.clear(rowField(index, 'amount'), 'proofs');
  }

  method(index: number, method: string): void {
    this.drafts.update(index, { method });
  }

  file(index: number, chosen: File | null): void {
    this.drafts.chooseFile(index, chosen);
    this.errors.clear(rowField(index, 'file'));
  }

  add(): void {
    if (this.drafts.add()) this.errors.clear('proofs');
  }

  remove(index: number): void {
    if (this.drafts.remove(index)) this.errors.clearPrefix('proofs');
  }

  /** What is under the amount of a row: the server's word first, then the local rule. */
  amountError(index: number): string | null {
    const server = this.errors.values()[rowField(index, 'amount')];
    if (server) return server;
    return this.drafts.amountError(index, this.submitted());
  }

  /** What is under the file of a row: the server's word first, then the local rule. */
  fileError(index: number): string | null {
    const server = this.errors.values()[rowField(index, 'file')];
    if (server) return server;
    return this.drafts.fileError(index, this.submitted());
  }
}
