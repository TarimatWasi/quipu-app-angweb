import { ProofDrafts } from './proof-drafts';
import { proofField, serializeProofs } from './proof-fields';
import { AMOUNT_TEXT, INVALID_FILE_TEXT, MAX_PROOFS, MISSING_FILE_TEXT } from './proof-rules';

const voucher = (name = 'voucher.pdf') => new File(['pdf'], name, { type: 'application/pdf' });

describe('ProofDrafts', () => {
  it('limits the collection and preserves row identity after removal and reload', () => {
    const editor = new ProofDrafts();
    expect(editor.remove(0)).toBe(false);
    for (let i = 1; i < MAX_PROOFS; i++) expect(editor.add()).toBe(true);
    expect(editor.add()).toBe(false);
    const keys = editor.drafts().map((proof) => proof.key);
    editor.remove(1);
    expect(editor.drafts().map((proof) => proof.key)).toEqual(keys.filter((_, i) => i !== 1));
    editor.add();
    expect(editor.drafts().at(-1)?.key).toBeGreaterThan(Math.max(...keys));
    editor.reset();
    expect(editor.drafts()).toHaveLength(1);
    expect(editor.drafts()[0]?.key).toBeGreaterThan(Math.max(...keys));
  });

  it('keeps sent files during a correction but still rejects an invalid replacement', () => {
    const editor = new ProofDrafts();
    editor.reset([
      { id: 'original', kind: 'VOUCHER', declaredAmount: 30, file: { name: 'old.png' } },
    ]);
    expect(editor.fileError(0, true)).toBeNull();
    expect(editor.sum()).toBe(30);
    editor.chooseFile(0, null);
    expect(editor.fileError(0, true)).toBeNull();
    editor.chooseFile(0, new File(['x'], 'invalid.txt', { type: 'text/plain' }));
    expect(editor.fileError(0, false)).toBe(INVALID_FILE_TEXT);
    expect(editor.drafts()[0]?.keptFile).toBe('old.png');
    editor.chooseFile(0, voucher());
    expect(editor.fileError(0, true)).toBeNull();
    expect(serializeProofs(editor.drafts(), true).proofs).toEqual([
      { id: 'original', kind: 'VOUCHER', amount: 30, fileIndex: 0 },
    ]);
  });

  it('requires a positive amount and a voucher only when appropriate', () => {
    const editor = new ProofDrafts();
    expect(editor.amountError(0, false)).toBeNull();
    expect(editor.amountError(0, true)).toBe(AMOUNT_TEXT);
    expect(editor.fileError(0, true)).toBe(MISSING_FILE_TEXT);
    editor.update(0, { amount: '0', kind: 'CASH' });
    expect(editor.amountError(0, true)).toBe(AMOUNT_TEXT);
    expect(editor.fileError(0, true)).toBeNull();
    editor.update(0, { amount: '12.50' });
    expect(editor.amountError(0, true)).toBeNull();
    expect(editor.sum()).toBe(12.5);
  });

  it('assigns consecutive file indices across kept vouchers and cash without leaking correction ids', () => {
    const editor = new ProofDrafts();
    editor.reset([
      { id: 'kept', kind: 'VOUCHER', declaredAmount: 10, file: { name: 'old.png' } },
      { id: 'cash', kind: 'CASH', declaredAmount: 20, method: 'ignored' },
    ]);
    // A file picked before switching to cash must never be uploaded for that cash row.
    editor.chooseFile(1, voucher('ignored.pdf'));
    editor.add();
    editor.update(2, { amount: '30', method: '  Yape  ' });
    editor.chooseFile(2, voucher('new.pdf'));
    editor.add();
    editor.update(3, { amount: '40', method: '  ' });
    editor.chooseFile(3, voucher('last.pdf'));
    const sent = serializeProofs(editor.drafts(), true);
    expect(sent.proofs).toEqual([
      { id: 'kept', kind: 'VOUCHER', amount: 10 },
      { id: 'cash', kind: 'CASH', amount: 20 },
      { kind: 'VOUCHER', amount: 30, method: 'Yape', fileIndex: 0 },
      { kind: 'VOUCHER', amount: 40, fileIndex: 1 },
    ]);
    expect(sent.files.map((file) => file.name)).toEqual(['new.pdf', 'last.pdf']);
    expect(serializeProofs(editor.drafts()).proofs.some((proof) => 'id' in proof)).toBe(false);
  });
});

describe('proofField', () => {
  it('normalizes supported server fields without accepting malformed or unaddressable indices', () => {
    expect(proofField('proofs[2].amount')).toEqual({ index: 2, part: 'amount' });
    expect(proofField('proofs[2].file')).toEqual({ index: 2, part: 'file' });
    expect(proofField('proofs[2].fileIndex')).toBeNull();
    expect(proofField('proofs[2].fileIndex', true)).toEqual({ index: 2, part: 'file' });
    for (const field of [
      'proofs[-1].amount',
      'proofs[0].other',
      'proofs[999999999999999999].file',
    ]) {
      expect(proofField(field, true)).toBeNull();
    }
  });
});
