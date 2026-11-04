import { HttpErrorResponse } from '@angular/common/http';
import type { components } from '@core/api/bff.generated';
import { isConcurrentModification, withVersion } from './concurrent-modification';

type Schemas = components['schemas'];

const http = (status: number, error: unknown) => new HttpErrorResponse({ status, error });

describe('isConcurrentModification (BE-SPR-DAT-13)', () => {
  it('recognizes a 409 whose body has the code CONCURRENT_MODIFICATION', () => {
    const body: Schemas['ConcurrentModificationError'] = {
      code: 'CONCURRENT_MODIFICATION',
      message: 'El registro cambió mientras lo editabas; vuelve a cargarlo e inténtalo de nuevo',
    };

    expect(isConcurrentModification(http(409, body))).toBe(true);
  });

  it('recognizes it even without a message: the code alone decides', () => {
    expect(isConcurrentModification(http(409, { code: 'CONCURRENT_MODIFICATION' }))).toBe(true);
  });

  it.each([
    ['ENVIRONMENT_CODE_TAKEN', { code: 'ENVIRONMENT_CODE_TAKEN', message: 'x', field: 'code' }],
    ['ENVIRONMENT_OCCUPIED', { code: 'ENVIRONMENT_OCCUPIED', message: 'x' }],
    ['a code in another case', { code: 'concurrent_modification', message: 'x' }],
    ['a non-string code', { code: 409, message: 'x' }],
    ['no code', { message: 'x' }],
  ])('rejects a 409 with %s', (_name, body) => {
    expect(isConcurrentModification(http(409, body))).toBe(false);
  });

  it.each([400, 404, 412, 423, 500, 0])(
    'rejects status %i even with the CONCURRENT_MODIFICATION code',
    (status) => {
      expect(isConcurrentModification(http(status, { code: 'CONCURRENT_MODIFICATION' }))).toBe(
        false,
      );
    },
  );

  it.each([
    ['a null body', null],
    ['no body', undefined],
    ['an HTML body', '<html>Conflict</html>'],
    ['a JSON text that was not parsed', '{"code":"CONCURRENT_MODIFICATION"}'],
    ['an array body', ['CONCURRENT_MODIFICATION']],
  ])('rejects a 409 with %s', (_name, body) => {
    expect(isConcurrentModification(http(409, body))).toBe(false);
  });

  it.each([
    [
      'a plain object shaped like the error',
      { status: 409, error: { code: 'CONCURRENT_MODIFICATION' } },
    ],
    ['an Error', new Error('CONCURRENT_MODIFICATION')],
    ['null', null],
    ['undefined', undefined],
  ])('rejects %s, which is not an HttpErrorResponse', (_name, error) => {
    expect(isConcurrentModification(error)).toBe(false);
  });
});

describe('withVersion', () => {
  it('adds the version of the loaded record to the changes', () => {
    const loaded = { id: 'a1', code: 'A-101', version: 7 };

    expect(withVersion(loaded, { code: 'A-102' })).toEqual({ code: 'A-102', version: 7 });
  });

  it('copies only the version from the loaded record, nothing else', () => {
    const loaded = { id: 'a1', code: 'A-101', name: 'Cuarto', version: 3 };

    const body = withVersion(loaded, { name: 'Cuarto grande' });

    expect(Object.keys(body).sort()).toEqual(['name', 'version']);
    expect(body).not.toHaveProperty('id');
    expect(body).not.toHaveProperty('code');
  });

  it('keeps the version that was loaded even if the changes carry another one', () => {
    const changes = { name: 'Cuarto', version: 99 } as { name: string };

    expect(withVersion({ version: 4 }, changes)).toEqual({ name: 'Cuarto', version: 4 });
  });

  it('sends the version zero of a record never changed', () => {
    expect(withVersion({ version: 0 }, { name: 'Cuarto' })).toEqual({ name: 'Cuarto', version: 0 });
  });

  it('does not change the loaded record nor the changes', () => {
    const loaded = { version: 2 };
    const changes = { name: 'Cuarto' };

    withVersion(loaded, changes);

    expect(loaded).toEqual({ version: 2 });
    expect(changes).toEqual({ name: 'Cuarto' });
  });

  it('builds the PATCH bodies of the contract from the loaded resources', () => {
    const stay = { version: 5 } as Schemas['Stay'];
    const guest = { version: 1 } as Schemas['PendingGuestDetail'];

    const stayBody: Schemas['StayUpdateInput'] = withVersion(stay, { agreedAmount: 450 });
    const guestBody: Schemas['GuestUpdateInput'] = withVersion(guest, {});

    expect(stayBody).toEqual({ agreedAmount: 450, version: 5 });
    expect(guestBody).toEqual({ version: 1 });
  });
});
