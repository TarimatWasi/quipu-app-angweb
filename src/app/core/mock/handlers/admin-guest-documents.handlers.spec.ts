import type { components } from '@core/api/bff.generated';
import { ADMIN_REVIEWER, GUEST_IDS } from '../data/demo-users';
import { today } from '../data/mock-dates';
import { catalogOf, resetMockSettings, setUpMockBff, SOME_TEXT } from '../mock-bff.testing';
import type { MockHarness } from '../mock-bff.testing';

type Schemas = components['schemas'];

async function admin(): Promise<MockHarness> {
  const mock = setUpMockBff('normal');
  await mock.signIn('admin');
  return mock;
}

const base = (id: string) => `/bff/admin/guests/${id}`;
const documents = (mock: MockHarness, id: string) =>
  mock.get<Schemas['GuestDocument'][]>(`${base(id)}/documents`);
/** The `n`-th document of a guest; it fails the test when there is none. */
async function documentAt(
  mock: MockHarness,
  id: string,
  n: number,
): Promise<Schemas['GuestDocument']> {
  const found = (await documents(mock, id))[n];
  if (found === undefined) throw new Error(`the guest has no document ${String(n)}`);
  return found;
}
const actions = (mock: MockHarness, id: string) =>
  mock.get<Schemas['PagedGuestDocumentActions']>(`${base(id)}/document-actions`);

function replacement(fields: Record<string, string>, file: File | null = png()): FormData {
  const body = new FormData();
  if (file) body.append('file', file, file.name);
  for (const [name, value] of Object.entries(fields)) body.append(name, value);
  return body;
}

const png = () => new File(['bytes'], 'dni-nitido.png', { type: 'image/png' });
const ARCO = { reason: 'ARCO_REQUEST', requestedAt: today(), requestChannel: 'WHATSAPP' };

describe('the documents of A3.8 in the simulated BFF', () => {
  afterEach(() => {
    resetMockSettings();
  });

  it('lists the documents of a guest with a link that lasts 15 minutes, and none without any', async () => {
    const mock = await admin();

    const luis = await documents(mock, GUEST_IDS.luis);
    expect(luis).toHaveLength(2);
    const first = await documentAt(mock, GUEST_IDS.luis, 0);
    expect(first.url).toMatch(/^\/mock-assets\//);
    const minutes = (Date.parse(first.urlExpiresAt) - Date.now()) / 60_000;
    expect(minutes).toBeGreaterThan(14);
    expect(minutes).toBeLessThanOrEqual(15);
    expect(await documents(mock, GUEST_IDS.noContract)).toEqual([]);
    expect((await mock.fail(documents(mock, 'nadie'))).status).toBe(404);
  });

  it('keeps the count of the detail in step with the documents', async () => {
    const mock = await admin();
    const first = await documentAt(mock, GUEST_IDS.luis, 0);

    await mock.send('POST', `${base(GUEST_IDS.luis)}/documents/${first.id}/deletion`, {
      reason: 'UPLOAD_ERROR',
    });

    const detail = await mock.get<Schemas['GuestDetail']>(base(GUEST_IDS.luis));
    expect(detail.documentCount).toBe(1);
  });

  it('shows the evidence without the name of the file, newest first', async () => {
    const mock = await admin();

    const page = await actions(mock, GUEST_IDS.luis);
    expect(page.nextCursor).toBeNull();
    expect(page.content).toHaveLength(1);
    expect(page.content[0]).toEqual(
      expect.objectContaining({
        action: 'REPLACE',
        reason: 'UPLOAD_ERROR',
        actorName: ADMIN_REVIEWER.name,
      }),
    );
    expect(JSON.stringify(page)).not.toContain('originalName');
    expect((await actions(mock, GUEST_IDS.maria)).content).toEqual([]);
  });

  it('deletes on an ARCO request, leaves the evidence and answers 204', async () => {
    const mock = await admin();
    const second = await documentAt(mock, GUEST_IDS.luis, 1);

    await mock.send('POST', `${base(GUEST_IDS.luis)}/documents/${second.id}/deletion`, {
      ...ARCO,
      note: '  Mensaje del 27 oct  ',
    });

    expect(await documents(mock, GUEST_IDS.luis)).toHaveLength(1);
    const [latest] = (await actions(mock, GUEST_IDS.luis)).content;
    expect(latest).toEqual(
      expect.objectContaining({
        action: 'DELETE',
        documentId: second.id,
        replacementDocumentId: null,
        reason: 'ARCO_REQUEST',
        requestChannel: 'WHATSAPP',
        note: 'Mensaje del 27 oct',
      }),
    );
    const again = await mock.fail(
      mock.send('POST', `${base(GUEST_IDS.luis)}/documents/${second.id}/deletion`, ARCO),
    );
    expect(again.status).toBe(404);
  });

  it('applies the rules of the reason with the field that breaks them', async () => {
    const mock = await admin();
    const first = await documentAt(mock, GUEST_IDS.luis, 0);
    const url = `${base(GUEST_IDS.luis)}/documents/${first.id}/deletion`;
    const bad = async (body: object) => catalogOf(await mock.fail(mock.send('POST', url, body)));
    const invalid = (field: string) => ({ code: 'VALIDATION_ERROR', message: SOME_TEXT, field });

    expect(await bad({})).toEqual(invalid('reason'));
    expect(await bad({ reason: 'OTRO' })).toEqual(invalid('reason'));
    expect(await bad({ reason: 'ARCO_REQUEST', requestChannel: 'EMAIL' })).toEqual(
      invalid('requestedAt'),
    );
    expect(await bad({ ...ARCO, requestedAt: '2999-01-01' })).toEqual(invalid('requestedAt'));
    expect(await bad({ ...ARCO, requestChannel: undefined })).toEqual(invalid('requestChannel'));
    expect(await bad({ reason: 'UPLOAD_ERROR', requestedAt: today() })).toEqual(
      invalid('requestedAt'),
    );
    expect(await bad({ reason: 'UPLOAD_ERROR', requestChannel: 'EMAIL' })).toEqual(
      invalid('requestChannel'),
    );
    expect(await bad({ reason: 'UPLOAD_ERROR', note: 'x'.repeat(501) })).toEqual(invalid('note'));
    expect(await documents(mock, GUEST_IDS.luis)).toHaveLength(2);
  });

  it('replaces a document: a new id, the new file, and an evidence that points at both', async () => {
    const mock = await admin();
    const first = await documentAt(mock, GUEST_IDS.luis, 0);

    const created = await mock.send<Schemas['GuestDocument']>(
      'PUT',
      `${base(GUEST_IDS.luis)}/documents/${first.id}`,
      replacement({ reason: 'UPLOAD_ERROR', note: '  ' }),
    );

    expect(created).toEqual(
      expect.objectContaining({ originalName: 'dni-nitido.png', contentType: 'image/png' }),
    );
    expect(created.id).not.toBe(first.id);
    const now = await documents(mock, GUEST_IDS.luis);
    expect(now.map((document) => document.id)).toContain(created.id);
    expect(now.map((document) => document.id)).not.toContain(first.id);
    const [latest] = (await actions(mock, GUEST_IDS.luis)).content;
    expect(latest).toEqual(
      expect.objectContaining({
        action: 'REPLACE',
        documentId: first.id,
        replacementDocumentId: created.id,
        note: null,
      }),
    );
  });

  it('refuses a file that is not JPG, PNG or PDF, or is over 5 MB, and a body that is not multipart', async () => {
    const mock = await admin();
    const first = await documentAt(mock, GUEST_IDS.luis, 0);
    const url = `${base(GUEST_IDS.luis)}/documents/${first.id}`;
    const fields = { reason: 'UPLOAD_ERROR' };
    const invalidFile = {
      code: 'DOCUMENT_INVALID_FILE',
      message: SOME_TEXT,
      field: 'file',
    };

    const text = new File(['x'], 'nota.txt', { type: 'text/plain' });
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'grande.png', {
      type: 'image/png',
    });
    for (const file of [text, big, null]) {
      const error = await mock.fail(mock.send('PUT', url, replacement(fields, file)));
      expect(catalogOf(error)).toEqual(invalidFile);
    }
    const json = await mock.fail(mock.send('PUT', url, fields));
    expect(json.status).toBe(415);
    expect(await documents(mock, GUEST_IDS.luis)).toHaveLength(2);
  });

  it('does not touch the documents of another guest', async () => {
    const mock = await admin();
    const first = await documentAt(mock, GUEST_IDS.luis, 0);

    const error = await mock.fail(
      mock.send('POST', `${base(GUEST_IDS.maria)}/documents/${first.id}/deletion`, ARCO),
    );

    expect(error.status).toBe(404);
    expect(await documents(mock, GUEST_IDS.luis)).toHaveLength(2);
  });
});
