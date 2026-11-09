import type { GuestRecord, MockDb } from '../data/mock-db';
import { seedDb } from '../data/seed';
import { MockFailure } from '../mock-reply';
import { confirmVerification, DEMO_CODE, requestVerification } from './guest-email.handlers';
import { pendingEmailOf } from './guest-email-state';

const NOW = 1_800_000_000_000;

function guestOf(fields: Partial<GuestRecord> = {}): GuestRecord {
  return {
    id: 'g1',
    version: 1,
    documentType: 'DNI',
    documentNumber: '70412233',
    name: 'Luis Huamán',
    type: 'CONTRACT',
    status: 'ACTIVE',
    phone: null,
    email: 'luis@example.com',
    hasLoginAccess: true,
    accessExpiresAt: null,
    deactivatedAt: null,
    documentCount: 0,
    ...fields,
  };
}

/** The seeded data with only these guests, so the administrators are the real ones. */
function dbOf(...guests: GuestRecord[]): MockDb {
  const db = seedDb('normal');
  db.data.guests.splice(0, db.data.guests.length, ...guests);
  return db;
}

interface Refusal {
  readonly status: number;
  readonly code: unknown;
  readonly field: unknown;
  readonly retryAfterSeconds?: unknown;
}

/** What the simulated BFF refused with, or null when it did not refuse. */
function refusal(run: () => void): Refusal | null {
  try {
    run();
    return null;
  } catch (error: unknown) {
    if (!(error instanceof MockFailure)) throw error;
    const body = (error.reply.body ?? {}) as Record<string, unknown>;
    return {
      status: error.reply.status,
      code: body['code'],
      field: body['field'],
      ...('retryAfterSeconds' in body && { retryAfterSeconds: body['retryAfterSeconds'] }),
    };
  }
}

describe('«Cambiar correo» in the simulated BFF (TAR-349)', () => {
  it('sends a code, and the email changes only when the code comes back', () => {
    const guest = guestOf();
    const db = dbOf(guest);

    requestVerification(db, guest, { email: ' luis@nuevo.pe ' }, NOW);
    expect(guest.email).toBe('luis@example.com');
    expect(pendingEmailOf(guest, NOW)).toBe('luis@nuevo.pe');

    confirmVerification(db, guest, { code: DEMO_CODE }, NOW + 1000);
    expect(guest.email).toBe('luis@nuevo.pe');
    expect(pendingEmailOf(guest, NOW + 1000)).toBeUndefined();
  });

  it('refuses the same address, another account’s and a malformed one', () => {
    const guest = guestOf();
    const db = dbOf(guest, guestOf({ id: 'g2', email: 'ana@example.com' }));
    const ask = (email: string) =>
      refusal(() => {
        requestVerification(db, guest, { email }, NOW);
      });

    expect(ask('LUIS@example.com')).toEqual({
      status: 400,
      code: 'EMAIL_UNCHANGED',
      field: 'email',
    });
    expect(ask('Ana@example.com')).toEqual({
      status: 409,
      code: 'ACCOUNT_EMAIL_TAKEN',
      field: 'email',
    });
    expect(ask(db.data.administrators[0]?.email ?? '')?.status).toBe(409);
    expect(ask('no-es')).toEqual({ status: 400, code: 'VALIDATION_ERROR', field: 'email' });
    expect(guest.emailVerification).toBeUndefined();
  });

  it('waits 60 s between codes and says how long is left', () => {
    const guest = guestOf();
    const db = dbOf(guest);
    requestVerification(db, guest, { email: 'luis@nuevo.pe' }, NOW);

    expect(
      refusal(() => {
        requestVerification(db, guest, { email: 'otro@nuevo.pe' }, NOW + 20_000);
      }),
    ).toEqual({
      status: 429,
      code: 'EMAIL_VERIFICATION_COOLDOWN',
      field: 'email',
      retryAfterSeconds: 40,
    });
    requestVerification(db, guest, { email: 'otro@nuevo.pe' }, NOW + 60_000);
    expect(pendingEmailOf(guest, NOW + 60_000)).toBe('otro@nuevo.pe');
  });

  it('counts wrong codes, and an expired or exhausted one asks for a new code', () => {
    const guest = guestOf();
    const db = dbOf(guest);
    const send = (code: string, at: number) =>
      refusal(() => {
        confirmVerification(db, guest, { code }, at);
      });
    requestVerification(db, guest, { email: 'luis@nuevo.pe' }, NOW);

    expect(send('000000', NOW)).toEqual({
      status: 400,
      code: 'EMAIL_VERIFICATION_INVALID',
      field: 'code',
    });
    for (let attempt = 0; attempt < 4; attempt += 1) send('000000', NOW);
    expect(send(DEMO_CODE, NOW)).toEqual({
      status: 400,
      code: 'EMAIL_VERIFICATION_EXPIRED',
      field: 'code',
    });

    requestVerification(db, guest, { email: 'luis@nuevo.pe' }, NOW + 60_000);
    expect(send(DEMO_CODE, NOW + 60_000 + 11 * 60_000)?.code).toBe('EMAIL_VERIFICATION_EXPIRED');
    expect(guest.email).toBe('luis@example.com');
  });

  it('says when another account took the address meanwhile', () => {
    const guest = guestOf();
    const other = guestOf({ id: 'g2', email: null });
    const db = dbOf(guest, other);
    requestVerification(db, guest, { email: 'luis@nuevo.pe' }, NOW);
    other.email = 'luis@nuevo.pe';

    expect(
      refusal(() => {
        confirmVerification(db, guest, { code: DEMO_CODE }, NOW);
      })?.code,
    ).toBe('ACCOUNT_EMAIL_TAKEN');
  });
});
