import { ProofsEditor } from './proofs-editor';

const voucher = (name = 'voucher.jpg', type = 'image/jpeg') => new File(['x'], name, { type });

function editor(options: { submitted?: boolean } = {}) {
  const state = { submitted: options.submitted ?? false };
  const proofs = new ProofsEditor(() => state.submitted);
  const serverError = (field: string, message = 'del servidor') => {
    proofs.errors.values.update((errors) => ({ ...errors, [field]: message }));
  };
  return { proofs, state, serverError, errors: () => proofs.errors.values() };
}

describe('ProofsEditor (TAR-326)', () => {
  it('changing the amount of a row forgets its server error and the one of the whole set', () => {
    const { proofs, serverError, errors } = editor();
    serverError('proofs[0].amount');
    serverError('proofs');
    serverError('proofs[0].file');

    proofs.amount(0, '120');

    expect(proofs.drafts.drafts()[0]?.amount).toBe('120');
    expect(errors()).toEqual({ 'proofs[0].file': 'del servidor' });
  });

  it('choosing the file of a row forgets only the error of that file', () => {
    const { proofs, serverError, errors } = editor();
    serverError('proofs[0].file');
    serverError('proofs');

    proofs.file(0, voucher());

    expect(proofs.drafts.drafts()[0]?.file).not.toBeNull();
    expect(errors()).toEqual({ proofs: 'del servidor' });
  });

  it('changing the kind forgets the error of its file and the one of the whole set (TAR-328)', () => {
    const { proofs, serverError, errors } = editor();
    serverError('proofs[0].file');
    serverError('proofs');
    serverError('proofs[0].amount');

    proofs.kind(0, 'CASH');

    expect(proofs.drafts.drafts()[0]?.kind).toBe('CASH');
    // The error of the amount of that row stays: the kind does not change it.
    expect(errors()).toEqual({ 'proofs[0].amount': 'del servidor' });
  });

  it('the method has no server error to forget', () => {
    const { proofs, serverError, errors } = editor();
    serverError('proofs[0].amount');

    proofs.method(0, 'Yape');

    expect(proofs.drafts.drafts()[0]?.method).toBe('Yape');
    expect(errors()).toEqual({ 'proofs[0].amount': 'del servidor' });
  });

  it('adding a row forgets the error of the set; at the limit nothing changes', () => {
    const { proofs, serverError, errors } = editor();
    serverError('proofs');

    proofs.add();
    expect(proofs.drafts.drafts()).toHaveLength(2);
    expect(errors()).toEqual({});

    while (!proofs.drafts.atLimit()) proofs.add();
    serverError('proofs');
    proofs.add();
    expect(errors()).toEqual({ proofs: 'del servidor' });
  });

  it('removing a row forgets every error of a row, since they name it by position', () => {
    const { proofs, serverError, errors } = editor();
    proofs.add();
    serverError('proofs[1].amount');
    serverError('proofs[0].file');
    serverError('other');

    proofs.remove(1);

    expect(proofs.drafts.drafts()).toHaveLength(1);
    expect(errors()).toEqual({ other: 'del servidor' });
  });

  it('removing the only row changes nothing', () => {
    const { proofs, serverError, errors } = editor();
    serverError('proofs[0].amount');

    proofs.remove(0);

    expect(proofs.drafts.drafts()).toHaveLength(1);
    expect(errors()).toEqual({ 'proofs[0].amount': 'del servidor' });
  });

  it('says the word of the server before the local rule, and the local rule only once submitted', () => {
    const { proofs, state, serverError } = editor();

    // Nothing typed and not submitted: no local error yet.
    expect(proofs.amountError(0)).toBeNull();
    expect(proofs.fileError(0)).toBeNull();

    state.submitted = true;
    expect(proofs.amountError(0)).not.toBeNull();

    serverError('proofs[0].amount', 'Monto rechazado');
    serverError('proofs[0].file', 'Archivo rechazado');
    expect(proofs.amountError(0)).toBe('Monto rechazado');
    expect(proofs.fileError(0)).toBe('Archivo rechazado');
  });

  it('says the amount rule in the words of its page, the administration by default (D-92)', () => {
    const own = new ProofsEditor(() => true, 'Escribe el monto que pagaste, mayor que cero.');
    const admin = new ProofsEditor(() => true);

    expect(own.amountError(0)).toBe('Escribe el monto que pagaste, mayor que cero.');
    expect(admin.amountError(0)).toBe('El monto debe ser mayor a 0');
  });
});
