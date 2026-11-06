import { proofsBody } from './proofs-body';

describe('proofsBody', () => {
  it('preserves multipart part order and file indices even when file names repeat', async () => {
    const first = new File(['one'], 'voucher.pdf', { type: 'application/pdf' });
    const second = new File(['two'], 'voucher.pdf', { type: 'application/pdf' });
    const proofs = [
      { kind: 'CASH', amount: 10 },
      { kind: 'VOUCHER', amount: 20, fileIndex: 0 },
      { kind: 'VOUCHER', amount: 30, fileIndex: 1 },
    ];
    const body = proofsBody(proofs, [first, second], { guestId: 'opaque', period: '2026-11' });
    expect([...body.keys()]).toEqual(['guestId', 'period', 'proofs', 'files', 'files']);
    const part = body.get('proofs') as Blob;
    expect(part.type).toBe('application/json');
    expect(JSON.parse(await part.text())).toEqual(proofs);
    const files = body.getAll('files') as File[];
    expect(await files[0]?.text()).toBe('one');
    expect(await files[1]?.text()).toBe('two');
  });
});
