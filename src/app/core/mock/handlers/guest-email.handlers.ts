import type { components } from '@core/api/bff.generated';
import { contactEmailError } from '@shared/forms/contact-rules';
import type { GuestRecord, MockDb } from '../data/mock-db';
import { invalid, MockFailure, noContent, raise } from '../mock-reply';
import type { MockContext, MockRoute } from '../mock-types';
import { pendingEmailOf } from './guest-email-state';
import { requireOpen, sessionGuest } from './guest-onboarding.handlers';
import { ownGuest } from './guest-profile.handlers';

type CooldownError = components['schemas']['EmailVerificationCooldownError'];

/** The code the simulated BFF always sends: there is no mailbox to read it from (TAR-349). */
export const DEMO_CODE = '123456';
const CODE_SHAPE = /^\d{6}$/;
const RESEND_WAIT_MS = 60_000;
const CODE_LIFE_MS = 10 * 60_000;

function bodyOf(body: unknown): Record<string, unknown> {
  return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
}

/** Another account (administrator or guest) already has it, whatever its case. */
function takenByOther(db: MockDb, guest: GuestRecord, email: string): boolean {
  const wanted = email.toLowerCase();
  return (
    db.data.administrators.some((admin) => admin.email.toLowerCase() === wanted) ||
    db.data.guests.some((other) => other.id !== guest.id && other.email?.toLowerCase() === wanted)
  );
}

/**
 * A code to the new address (202): the same address is EMAIL_UNCHANGED, another account's is
 * ACCOUNT_EMAIL_TAKEN and a second code within 60 s of the last one is the 429 with its wait. A new
 * request replaces the pending one and its attempts.
 */
export function requestVerification(
  db: MockDb,
  guest: GuestRecord,
  body: unknown,
  now = Date.now(),
): void {
  const fields = bodyOf(body);
  if (Object.keys(fields).some((key) => key !== 'email')) invalid('body');
  const raw = fields['email'];
  if (typeof raw !== 'string' || raw.trim() === '' || contactEmailError(raw) !== null) {
    return invalid('email');
  }
  const email = raw.trim();
  if (guest.email !== null && guest.email.toLowerCase() === email.toLowerCase()) {
    raise(400, 'EMAIL_UNCHANGED', 'Ese ya es tu correo', 'email');
  }
  if (takenByOther(db, guest, email)) {
    raise(409, 'ACCOUNT_EMAIL_TAKEN', 'El correo ya está registrado', 'email');
  }
  const last = guest.emailVerification;
  if (last !== undefined && now - last.sentAt < RESEND_WAIT_MS) {
    const retryAfterSeconds = Math.ceil((RESEND_WAIT_MS - (now - last.sentAt)) / 1000);
    const cooldown: CooldownError = {
      code: 'EMAIL_VERIFICATION_COOLDOWN',
      message: 'Espera un momento antes de pedir otro código',
      field: 'email',
      retryAfterSeconds,
    };
    throw new MockFailure({ status: 429, body: cooldown });
  }
  guest.emailVerification = {
    email,
    code: DEMO_CODE,
    sentAt: now,
    expiresAt: now + CODE_LIFE_MS,
    attempts: 0,
  };
}

/**
 * The code (204): only now the email changes. A wrong one counts an attempt; one that expired or
 * ran out of attempts, or none pending, is EMAIL_VERIFICATION_EXPIRED; an address another account
 * took meanwhile is ACCOUNT_EMAIL_TAKEN.
 */
export function confirmVerification(
  db: MockDb,
  guest: GuestRecord,
  body: unknown,
  now = Date.now(),
): void {
  const fields = bodyOf(body);
  if (Object.keys(fields).some((key) => key !== 'code')) invalid('body');
  const code = fields['code'];
  if (typeof code !== 'string' || !CODE_SHAPE.test(code)) invalid('code');
  const pending = guest.emailVerification;
  if (pending === undefined || pendingEmailOf(guest, now) === undefined) {
    raise(400, 'EMAIL_VERIFICATION_EXPIRED', 'El código venció, pide uno nuevo', 'code');
  }
  if (code !== pending.code) {
    pending.attempts += 1;
    raise(400, 'EMAIL_VERIFICATION_INVALID', 'El código no es correcto', 'code');
  }
  if (takenByOther(db, guest, pending.email)) {
    raise(409, 'ACCOUNT_EMAIL_TAKEN', 'El correo ya está registrado', 'email');
  }
  guest.email = pending.email;
  delete guest.emailVerification;
  guest.version += 1;
}

type GuestOf = (ctx: MockContext) => GuestRecord;

const onboardingGuest: GuestOf = (ctx) => {
  const guest = sessionGuest(ctx);
  requireOpen(guest);
  return guest;
};

const contractGuest: GuestOf = (ctx) => ownGuest(ctx, 'CONTRACT');
const temporaryGuest: GuestOf = (ctx) => ownGuest(ctx, 'TEMPORARY');

const request =
  (guestOf: GuestOf): MockRoute['handler'] =>
  (req, ctx) => {
    requestVerification(ctx.db, guestOf(ctx), req.body);
    return noContent(202);
  };
const confirm =
  (guestOf: GuestOf): MockRoute['handler'] =>
  (req, ctx) => {
    confirmVerification(ctx.db, guestOf(ctx), req.body);
    return noContent(204);
  };

/** «Cambiar correo» with a code (TAR-349): one path per role, as the contract has it. */
export const GUEST_EMAIL_ROUTES: readonly MockRoute[] = [
  { key: 'POST /bff/guest/email-verification', handler: request(contractGuest) },
  { key: 'POST /bff/guest/email-verification/confirm', handler: confirm(contractGuest) },
  { key: 'POST /bff/temporary-guest/email-verification', handler: request(temporaryGuest) },
  {
    key: 'POST /bff/temporary-guest/email-verification/confirm',
    handler: confirm(temporaryGuest),
  },
  { key: 'POST /bff/guest/onboarding/email-verification', handler: request(onboardingGuest) },
  {
    key: 'POST /bff/guest/onboarding/email-verification/confirm',
    handler: confirm(onboardingGuest),
  },
];
