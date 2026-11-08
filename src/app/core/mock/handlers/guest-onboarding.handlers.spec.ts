import type { components } from '@core/api/bff.generated';
import { catalogOf, resetMockSettings, setUpMockBff } from '../mock-bff.testing';
import type { MockHarness } from '../mock-bff.testing';

type Schemas = components['schemas'];

const data = { name: ' Sonia Ccama Flores ', phone: '984 112 730' };
const file = (name = 'dni.jpg', type = 'image/jpeg') => {
  const body = new FormData();
  body.append('file', new File(['bytes'], name, { type }), name);
  return body;
};

async function starting(): Promise<MockHarness> {
  const mock = setUpMockBff();
  await mock.signIn('onboarding-guest');
  return mock;
}

describe('the onboarding of the simulated BFF (O1 to O3)', () => {
  afterEach(() => {
    resetMockSettings();
  });

  it('starts at the personal data, with the consent text in force', async () => {
    const mock = await starting();

    const state = await mock.get<Schemas['OnboardingState']>('/bff/guest/onboarding');

    expect(state).toEqual(
      expect.objectContaining({ status: 'ONBOARDING', nextStep: 'PERSONAL_DATA', documents: [] }),
    );
    expect(state.consent).toEqual(expect.objectContaining({ version: '2026-10', accepted: false }));
    expect(state.consent.text).not.toBe('');
  });

  it('does not let a later step in before the personal data', async () => {
    const mock = await starting();

    for (const call of [
      mock.send('POST', '/bff/guest/onboarding/documents', file()),
      mock.send('POST', '/bff/guest/onboarding/documents/done', null),
      mock.send('POST', '/bff/guest/onboarding/consent', {
        accepted: true,
        consentVersion: '2026-10',
      }),
    ]) {
      const error = await mock.fail(call);
      expect(error.status).toBe(409);
      expect(catalogOf(error)).toEqual(
        expect.objectContaining({ code: 'ONBOARDING_STEP_OUT_OF_ORDER' }),
      );
    }
  });

  it('checks the personal data: name and phone are required, the email is not taken', async () => {
    const mock = await starting();

    const noPhone = await mock.fail(
      mock.send('PUT', '/bff/guest/onboarding/personal-data', { name: 'Sonia' }),
    );
    expect(noPhone.status).toBe(400);
    expect(noPhone.error).toEqual(expect.objectContaining({ field: 'phone' }));

    const taken = await mock.fail(
      mock.send('PUT', '/bff/guest/onboarding/personal-data', {
        ...data,
        contactEmail: 'luis.huaman@example.com',
      }),
    );
    expect(taken.status).toBe(409);
    expect(catalogOf(taken)).toEqual(expect.objectContaining({ code: 'GUEST_EMAIL_TAKEN' }));
  });

  it('goes through the three steps and leaves the guest Active', async () => {
    const mock = await starting();

    const saved = await mock.send<Schemas['OnboardingDocumentsPending']>(
      'PUT',
      '/bff/guest/onboarding/personal-data',
      { ...data, emergencyContact: { name: 'Teodoro', relationship: 'Padre' } },
    );
    expect(saved.nextStep).toBe('DOCUMENTS');
    expect(saved.personalData.name).toBe('Sonia Ccama Flores');
    expect((await mock.get<Schemas['SessionInfo']>('/bff/auth/me')).name).toBe(
      'Sonia Ccama Flores',
    );

    await mock.send('POST', '/bff/guest/onboarding/documents', file());
    const done = await mock.send<Schemas['OnboardingConsentPending']>(
      'POST',
      '/bff/guest/onboarding/documents/done',
      null,
    );
    expect(done.nextStep).toBe('CONSENT');
    expect(done.documents).toHaveLength(1);
    expect(await mock.get<Schemas['SessionInfo']>('/bff/auth/me')).toEqual(
      expect.objectContaining({ guestStatus: 'ONBOARDING', nextOnboardingStep: 'CONSENT' }),
    );

    const completed = await mock.send<Schemas['OnboardingCompleted']>(
      'POST',
      '/bff/guest/onboarding/consent',
      { accepted: true, consentVersion: '2026-10' },
    );
    expect(completed.status).toBe('ACTIVE');
    expect(await mock.get<Schemas['SessionInfo']>('/bff/auth/me')).toEqual(
      expect.objectContaining({ guestStatus: 'ACTIVE' }),
    );
  });

  it('refuses a consent that is not accepted or is of another version', async () => {
    const mock = await starting();
    await mock.send('PUT', '/bff/guest/onboarding/personal-data', data);

    const notAccepted = await mock.fail(
      mock.send('POST', '/bff/guest/onboarding/consent', {
        accepted: false,
        consentVersion: '2026-10',
      }),
    );
    expect(catalogOf(notAccepted)).toEqual(
      expect.objectContaining({ code: 'CONSENT_NOT_ACCEPTED' }),
    );

    const old = await mock.fail(
      mock.send('POST', '/bff/guest/onboarding/consent', {
        accepted: true,
        consentVersion: '2026-01',
      }),
    );
    expect(old.error).toEqual(
      expect.objectContaining({ code: 'VALIDATION_ERROR', field: 'consentVersion' }),
    );
  });

  it('answers ONBOARDING_ALREADY_COMPLETED to every step once the guest is Active', async () => {
    const mock = await starting();
    await mock.send('PUT', '/bff/guest/onboarding/personal-data', data);
    await mock.send('POST', '/bff/guest/onboarding/consent', {
      accepted: true,
      consentVersion: '2026-10',
    });

    const error = await mock.fail(mock.send('PUT', '/bff/guest/onboarding/personal-data', data));

    expect(error.status).toBe(409);
    expect(catalogOf(error)).toEqual(
      expect.objectContaining({ code: 'ONBOARDING_ALREADY_COMPLETED' }),
    );
  });

  it('keeps the limit of five documents and the file rules of the onboarding', async () => {
    const mock = await starting();
    await mock.send('PUT', '/bff/guest/onboarding/personal-data', data);

    const bad = await mock.fail(
      mock.send('POST', '/bff/guest/onboarding/documents', file('foto.heic', 'image/heic')),
    );
    expect(catalogOf(bad)).toEqual(expect.objectContaining({ code: 'DOCUMENT_INVALID_FILE' }));

    for (let index = 0; index < 5; index++) {
      await mock.send('POST', '/bff/guest/onboarding/documents', file(`dni-${String(index)}.jpg`));
    }
    const sixth = await mock.fail(mock.send('POST', '/bff/guest/onboarding/documents', file()));
    expect(sixth.status).toBe(409);
    expect(catalogOf(sixth)).toEqual(expect.objectContaining({ code: 'DOCUMENT_LIMIT_REACHED' }));
  });
});
