import type { components } from '@core/api/bff.generated';
import { GUEST_IDS } from '../data/demo-users';
import { ID_KIND } from '../data/mock-db';
import { catalogOf, resetMockSettings, setUpMockBff, SOME_TEXT } from '../mock-bff.testing';
import type { MockHarness } from '../mock-bff.testing';

type Schemas = components['schemas'];

async function signedIn(key: 'contract-guest' | 'temporary-guest'): Promise<MockHarness> {
  const mock = setUpMockBff();
  await mock.signIn(key);
  return mock;
}

const paths = [
  ['the guest with a contract (H5)', 'contract-guest', '/bff/guest'],
  ['the temporary guest (T3)', 'temporary-guest', '/bff/temporary-guest'],
] as const;

const upload = (name = 'constancia.pdf', type = 'application/pdf') => {
  const body = new FormData();
  body.append('file', new File(['bytes'], name, { type }), name);
  return body;
};

describe.each(paths)('the own profile of %s in the simulated BFF', (_who, key, base) => {
  afterEach(() => {
    resetMockSettings();
  });

  it('answers the data, the account email and the documents without links', async () => {
    const mock = await signedIn(key);

    const profile = await mock.get<Schemas['OwnProfile']>(`${base}/profile`);

    expect(profile.name).not.toBe('');
    expect(profile.documentsLimit).toBe(5);
    expect(profile.documents.length).toBeGreaterThan(0);
    expect(JSON.stringify(profile.documents)).not.toContain('url');
    expect(JSON.stringify(profile.documents)).not.toContain('guestId');
  });

  it('changes only what is sent and answers the summary of the guest', async () => {
    const mock = await signedIn(key);
    const before = await mock.get<Schemas['OwnProfile']>(`${base}/profile`);

    await mock.send('PATCH', `${base}/profile`, {
      phone: '  912 345 678 ',
      emergencyContact: { name: 'Rosa', relationship: 'Madre', phone: '+51 951 234 567' },
    });

    const after = await mock.get<Schemas['OwnProfile']>(`${base}/profile`);
    expect(after.phone).toBe('912 345 678');
    expect(after.name).toBe(before.name);
    expect(after.emergencyContact).toEqual({
      name: 'Rosa',
      relationship: 'Madre',
      phone: '+51 951 234 567',
    });
  });

  it('refuses what the BFF refuses, with the field that breaks it', async () => {
    const mock = await signedIn(key);
    const bad = async (body: object) =>
      catalogOf(await mock.fail(mock.send('PATCH', `${base}/profile`, body)));
    const invalid = (field: string) => ({ code: 'VALIDATION_ERROR', message: SOME_TEXT, field });

    expect(await bad({})).toEqual(invalid('body'));
    expect(await bad({ document: 'x' })).toEqual(invalid('body'));
    expect(await bad({ name: '  ' })).toEqual(invalid('name'));
    expect(await bad({ phone: '12' })).toEqual(invalid('phone'));
    expect(await bad({ contactEmail: 'no-es-correo' })).toEqual(invalid('contactEmail'));
    expect(await bad({ emergencyContact: { phone: '12' } })).toEqual(
      invalid('emergencyContact.phone'),
    );
    expect(await bad({ emergencyContact: { otro: 'x' } })).toEqual(invalid('emergencyContact'));
  });

  it('says 409 when the email is already the contact email of another guest', async () => {
    const mock = await signedIn(key);
    const own = key === 'contract-guest' ? GUEST_IDS.luis : GUEST_IDS.ana;
    const other = mock.bff.db.data.guests.find(
      (guest) => guest.id !== own && guest.contactEmail !== null,
    );
    if (other?.contactEmail == null) throw new Error('expected a guest with a contact email');

    const error = await mock.fail(
      mock.send('PATCH', `${base}/profile`, { contactEmail: other.contactEmail.toUpperCase() }),
    );

    expect(catalogOf(error)).toEqual({
      code: 'GUEST_EMAIL_TAKEN',
      message: SOME_TEXT,
      field: 'contactEmail',
    });
  });

  it('uploads a document that then shows in the profile, and opens it with a link', async () => {
    const mock = await signedIn(key);
    const before = await mock.get<Schemas['OwnProfile']>(`${base}/profile`);

    const created = await mock.send<Schemas['GuestDocumentRef']>(
      'POST',
      `${base}/documents`,
      upload(),
    );

    const after = await mock.get<Schemas['OwnProfile']>(`${base}/profile`);
    expect(after.documents).toHaveLength(before.documents.length + 1);
    expect(created).toEqual(
      expect.objectContaining({ originalName: 'constancia.pdf', contentType: 'application/pdf' }),
    );
    const opened = await mock.get<Schemas['GuestDocument']>(`${base}/documents/${created.id}`);
    expect(opened.url).toMatch(/^\/mock-assets\//);
    expect(Date.parse(opened.urlExpiresAt)).toBeGreaterThan(Date.now());
  });

  it('refuses a file that is not JPG, PNG or PDF, and a sixth document', async () => {
    const mock = await signedIn(key);
    const text = upload('nota.txt', 'text/plain');

    const invalid = await mock.fail(mock.send('POST', `${base}/documents`, text));
    expect(catalogOf(invalid)).toEqual(
      expect.objectContaining({ code: 'DOCUMENT_INVALID_FILE', field: 'file' }),
    );
    for (
      let count = (await mock.get<Schemas['OwnProfile']>(`${base}/profile`)).documents.length;
      count < 5;
      count += 1
    ) {
      await mock.send('POST', `${base}/documents`, upload());
    }
    const sixth = await mock.fail(mock.send('POST', `${base}/documents`, upload()));
    expect(catalogOf(sixth)).toEqual(expect.objectContaining({ code: 'DOCUMENT_LIMIT_REACHED' }));
  });

  it('opens only its own documents: another guest or a deleted one is a 404', async () => {
    const mock = await signedIn(key);
    const foreign = mock.bff.db.newId(ID_KIND.document);
    mock.bff.db.data.documents.push({
      id: foreign,
      guestId: GUEST_IDS.maria,
      originalName: 'ajeno.pdf',
      contentType: 'application/pdf',
      sizeBytes: 10,
      uploadedAt: '2026-10-01T10:00:00Z',
    });

    expect((await mock.fail(mock.get(`${base}/documents/${foreign}`))).status).toBe(404);
    expect((await mock.fail(mock.get(`${base}/documents/nadie`))).status).toBe(404);
  });
});

describe('the own profile in the simulated BFF: who may ask', () => {
  afterEach(() => {
    resetMockSettings();
  });

  it('keeps the profile of a kind of guest from the other and from the administration', async () => {
    const temporary = await signedIn('temporary-guest');
    expect((await temporary.fail(temporary.get('/bff/guest/profile'))).status).toBe(403);
    resetMockSettings();
  });

  it('keeps it from the administration', async () => {
    const mock = setUpMockBff();
    await mock.signIn('admin');

    expect((await mock.fail(mock.get('/bff/guest/profile'))).status).toBe(403);
    expect((await mock.fail(mock.get('/bff/temporary-guest/profile'))).status).toBe(403);
  });
});
