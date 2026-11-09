import { parseAmount } from './payment-format';
import { AMOUNT_TEXT, INVALID_FILE_TEXT, MISSING_FILE_TEXT } from './proof-rules';

export interface ProofDraft {
  readonly key: number;
  readonly id: string | null;
  readonly kind: 'VOUCHER' | 'CASH';
  readonly amount: string;
  readonly method: string;
  readonly file: File | null;
  readonly keptFile: string | null;
  readonly fileInvalid: boolean;
}

/** Structural input: API types remain in the data layer of each feature. */
export interface SavedProof {
  readonly id: string;
  readonly kind: ProofDraft['kind'];
  readonly declaredAmount: number;
  readonly method?: string | null;
  readonly file?: { readonly name: string } | null;
}

export interface ProofPayload {
  readonly id?: string;
  readonly kind: ProofDraft['kind'];
  readonly amount: number;
  readonly method?: string;
  readonly fileIndex?: number;
}

/** `text` is what the page says: the guest's own words differ from the administration's (D-92). */
export function proofAmountError(
  amount: string,
  submitted: boolean,
  text = AMOUNT_TEXT,
): string | null {
  const value = parseAmount(amount);
  return submitted && (value === null || value <= 0) ? text : null;
}

export function proofFileError(
  proof: Pick<ProofDraft, 'kind' | 'file' | 'fileInvalid'> & { readonly keptFile?: string | null },
  submitted: boolean,
): string | null {
  if (proof.kind !== 'VOUCHER') return null;
  if (proof.fileInvalid) return INVALID_FILE_TEXT;
  return submitted && proof.file === null && (proof.keptFile ?? null) === null
    ? MISSING_FILE_TEXT
    : null;
}

/** Normalize only fields supported by the caller; older operations do not expose fileIndex. */
export function proofField(
  field: string,
  allowFileIndex = false,
): { index: number; part: 'amount' | 'file' } | null {
  const match = /^proofs\[(\d+)\]\.(amount|file|fileIndex)$/.exec(field);
  if (!match || (match[2] === 'fileIndex' && !allowFileIndex)) return null;
  const index = Number(match[1]);
  return Number.isSafeInteger(index)
    ? { index, part: match[2] === 'amount' ? 'amount' : 'file' }
    : null;
}

/** Validated drafts in display order; only newly chosen voucher files receive a fileIndex. */
export function serializeProofs(drafts: readonly ProofDraft[], includeIds = false) {
  const files: File[] = [];
  const proofs: ProofPayload[] = drafts.map((draft) => {
    const base = {
      ...(includeIds && draft.id !== null ? { id: draft.id } : {}),
      kind: draft.kind,
      amount: parseAmount(draft.amount) ?? 0,
    };
    if (draft.kind === 'CASH') return base;
    const method = draft.method.trim();
    const fileIndex = draft.file === null ? undefined : files.push(draft.file) - 1;
    return {
      ...base,
      ...(method ? { method } : {}),
      ...(fileIndex !== undefined ? { fileIndex } : {}),
    };
  });
  return { proofs, files };
}
