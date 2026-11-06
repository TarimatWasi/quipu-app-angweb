import { FieldErrors } from './field-errors';

describe('FieldErrors', () => {
  it('clears edited fields and indexed collection errors without losing unrelated messages', () => {
    const errors = new FieldErrors();
    errors.values.set({
      period: 'period',
      guestId: 'guest',
      'proofs[1].amount': 'amount',
      proofs: 'sum',
    });
    const original = errors.values();
    errors.clear('unknown');
    expect(errors.values()).toBe(original);
    errors.clear('period');
    expect(errors.values()['guestId']).toBe('guest');
    errors.clearPrefix('proofs');
    expect(errors.values()).toEqual({ guestId: 'guest' });
    expect(original['period']).toBe('period');
  });
});
