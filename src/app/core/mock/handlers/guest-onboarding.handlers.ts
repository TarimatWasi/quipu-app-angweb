import type { components } from '@core/api/bff.generated';
import { contactEmailError, phoneError } from '@shared/forms/contact-rules';
import { CONSENT_TEXT, CONSENT_VERSION } from '../data/consent-text';
import type { GuestRecord, MockDb } from '../data/mock-db';
import { invalid, ok, raise } from '../mock-reply';
import type { MockContext, MockRoute } from '../mock-types';
import {
  documentRef,
  emailTaken,
  emergencyOf,
  MAX_NAME_LENGTH,
  MAX_PHONE_LENGTH,
  text,
  uploadDocument,
} from './guest-profile.handlers';

type Schemas = components['schemas'];
type Progress = Schemas['OnboardingProgress'];
type PersonalData = Schemas['PersonalDataInput'];

// What the guest has done, in the order of RN-33. The documents step is optional but offered once.
const ORDER: readonly Progress[] = [
  'NOT_STARTED',
  'PASSWORD_SET',
  'PERSONAL_DATA_SAVED',
  'DOCUMENTS_DONE',
  'COMPLETED',
];
const PERSONAL_DATA_FIELDS = new Set(['name', 'phone', 'contactEmail', 'emergencyContact']);

/** The guest of the session, whatever its type: the onboarding is the same for both. */
function sessionGuest(ctx: MockContext): GuestRecord {
  const session = ctx.user()?.session;
  const { guestId } = ctx.requireGuest(session?.role === 'GUEST' ? session.guestType : 'CONTRACT');
  return ctx.db.guest(guestId) ?? raise(404, 'RESOURCE_NOT_FOUND', 'No encontramos lo que buscas.');
}

function progressOf(guest: GuestRecord): Progress {
  return guest.status === 'ACTIVE' ? 'COMPLETED' : (guest.onboardingProgress ?? 'PASSWORD_SET');
}

function reached(guest: GuestRecord, step: Progress): boolean {
  return ORDER.indexOf(progressOf(guest)) >= ORDER.indexOf(step);
}

/** Only while the guest is in onboarding; after that its data goes through the profile (RN-33). */
function requireOpen(guest: GuestRecord): void {
  if (guest.status === 'ACTIVE') {
    raise(409, 'ONBOARDING_ALREADY_COMPLETED', 'El registro ya está completo.');
  }
}

/** A step that needs the personal data (RN-33) answers 409 until it is saved. */
function requireDataSaved(guest: GuestRecord): void {
  requireOpen(guest);
  if (!reached(guest, 'PERSONAL_DATA_SAVED')) {
    raise(409, 'ONBOARDING_STEP_OUT_OF_ORDER', 'Completa antes el paso anterior.');
  }
}

function personalData(guest: GuestRecord): PersonalData {
  return {
    name: guest.name ?? '',
    phone: guest.phone ?? '',
    ...(guest.contactEmail !== null && { contactEmail: guest.contactEmail }),
    ...(guest.emergencyContact && { emergencyContact: guest.emergencyContact }),
  };
}

/** getOnboarding: the first pending step, what is saved and the consent text in force. */
function onboardingState(db: MockDb, guest: GuestRecord): Schemas['OnboardingState'] {
  const documents = db.documentsOf(guest.id).map(documentRef);
  const consent = { version: CONSENT_VERSION, text: CONSENT_TEXT };
  if (guest.status === 'ACTIVE') {
    return {
      status: 'ACTIVE',
      personalData: personalData(guest),
      documents,
      consent: { ...consent, accepted: true },
    };
  }
  const pending = { ...consent, accepted: false } as const;
  if (!reached(guest, 'PERSONAL_DATA_SAVED')) {
    return { status: 'ONBOARDING', nextStep: 'PERSONAL_DATA', documents, consent: pending };
  }
  return {
    status: 'ONBOARDING',
    nextStep: reached(guest, 'DOCUMENTS_DONE') ? 'CONSENT' : 'DOCUMENTS',
    personalData: personalData(guest),
    documents,
    consent: pending,
  };
}

function documentsPending(db: MockDb, guest: GuestRecord): Schemas['OnboardingDocumentsPending'] {
  const state = onboardingState(db, guest);
  if (state.status !== 'ONBOARDING' || !('personalData' in state)) return raise(500, 'MOCK', '');
  return { ...state, nextStep: 'DOCUMENTS' };
}

function consentPending(db: MockDb, guest: GuestRecord): Schemas['OnboardingConsentPending'] {
  const state = onboardingState(db, guest);
  if (state.status !== 'ONBOARDING' || !('personalData' in state)) return raise(500, 'MOCK', '');
  return { ...state, nextStep: 'CONSENT' };
}

/** savePersonalData (O1): the name and the phone are required; the rest is optional (RN-17). */
function savePersonalData(db: MockDb, guest: GuestRecord, body: unknown) {
  requireOpen(guest);
  const fields = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  if (Object.keys(fields).some((key) => !PERSONAL_DATA_FIELDS.has(key))) invalid('body');
  const name = text(fields, 'name', MAX_NAME_LENGTH) ?? invalid('name');
  const phone = text(fields, 'phone', MAX_PHONE_LENGTH) ?? invalid('phone');
  if (phoneError(phone) !== null) invalid('phone');
  const email = text(fields, 'contactEmail', 200);
  if (email !== undefined && contactEmailError(email) !== null) invalid('contactEmail');
  const emergency =
    fields['emergencyContact'] === undefined ? undefined : emergencyOf(fields['emergencyContact']);
  if (email !== undefined && emailTaken(db, guest, email)) {
    raise(409, 'GUEST_EMAIL_TAKEN', 'El correo ya está registrado', 'contactEmail');
  }
  guest.name = name;
  guest.phone = phone;
  guest.contactEmail = email ?? null;
  guest.emergencyContact = emergency;
  if (!reached(guest, 'PERSONAL_DATA_SAVED')) guest.onboardingProgress = 'PERSONAL_DATA_SAVED';
  guest.version += 1;
  return documentsPending(db, guest);
}

/** acceptConsent (O3): the text accepted is the one in force; with it the guest is Active (RN-36). */
function acceptConsent(db: MockDb, guest: GuestRecord, body: unknown) {
  requireDataSaved(guest);
  const fields = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  if (fields['accepted'] !== true) {
    raise(400, 'CONSENT_NOT_ACCEPTED', 'Debes aceptar el consentimiento.', 'accepted');
  }
  if (fields['consentVersion'] !== CONSENT_VERSION) invalid('consentVersion');
  guest.status = 'ACTIVE';
  guest.onboardingProgress = 'COMPLETED';
  guest.version += 1;
  return onboardingState(db, guest);
}

/** O1 to O3: the onboarding of the guest of the session, for both kinds of guest. */
export const GUEST_ONBOARDING_ROUTES: readonly MockRoute[] = [
  {
    key: 'GET /bff/guest/onboarding',
    handler: (_req, ctx) => ok(onboardingState(ctx.db, sessionGuest(ctx))),
  },
  {
    key: 'PUT /bff/guest/onboarding/personal-data',
    handler: (req, ctx) => ok(savePersonalData(ctx.db, sessionGuest(ctx), req.body)),
  },
  {
    key: 'POST /bff/guest/onboarding/documents',
    handler: (req, ctx) => {
      const guest = sessionGuest(ctx);
      requireDataSaved(guest);
      return ok(uploadDocument(ctx.db, guest, req.body), 201);
    },
  },
  {
    key: 'POST /bff/guest/onboarding/documents/done',
    handler: (_req, ctx) => {
      const guest = sessionGuest(ctx);
      requireDataSaved(guest);
      if (!reached(guest, 'DOCUMENTS_DONE')) guest.onboardingProgress = 'DOCUMENTS_DONE';
      return ok(consentPending(ctx.db, guest));
    },
  },
  {
    key: 'POST /bff/guest/onboarding/consent',
    handler: (req, ctx) => ok(acceptConsent(ctx.db, sessionGuest(ctx), req.body)),
  },
];
