import type {
  GuestDocument,
  GuestDocumentAction,
} from '@core/api/clients/admin-guest-documents.service';
import { INVALID_FILE_TEXT } from '@shared/payments/proof-rules';
import {
  actionProblem,
  actionRequest,
  actionSubmitLabel,
  actionTitle,
  draftProblems,
  EMPTY_DRAFT,
  isLinkExpired,
  toActionRow,
  toDocumentRow,
} from './documents';
import type { ActionDraft } from './documents';

const TODAY = '2026-11-06';
const NOW = new Date('2026-11-06T15:30:00Z');
const FILE = new File(['x'], 'dni.png', { type: 'image/png' });

const draft = (fields: Partial<ActionDraft>): ActionDraft => ({ ...EMPTY_DRAFT, ...fields });
const failure = (status: number, code: string | null = null, field: string | null = null) => ({
  status,
  code,
  field,
  body: {},
});

describe('the dialog of A3.8: what the draft needs', () => {
  it('asks for the reason first and, with ARCO, the day and the channel of the request', () => {
    expect(draftProblems(EMPTY_DRAFT, 'delete', TODAY)).toEqual({ reason: 'Elige el motivo.' });
    expect(draftProblems(draft({ reason: 'ARCO_REQUEST' }), 'delete', TODAY)).toEqual({
      requestedAt: 'Elige la fecha en que lo pidió.',
      requestChannel: 'Elige por dónde lo pidió.',
    });
    expect(draftProblems(draft({ reason: 'UPLOAD_ERROR' }), 'delete', TODAY)).toEqual({});
  });

  it('refuses a request dated after today but accepts today', () => {
    const arco = draft({ reason: 'ARCO_REQUEST', channel: 'EMAIL' });

    expect(draftProblems({ ...arco, requestedAt: '2026-11-07' }, 'delete', TODAY)).toEqual({
      requestedAt: 'La fecha no puede ser futura.',
    });
    expect(draftProblems({ ...arco, requestedAt: TODAY }, 'delete', TODAY)).toEqual({});
  });

  it('asks for the new file only when replacing, and says when it is not valid', () => {
    const error = draft({ reason: 'UPLOAD_ERROR' });

    expect(draftProblems(error, 'delete', TODAY)).toEqual({});
    expect(draftProblems(error, 'replace', TODAY)).toEqual({
      file: 'Elige el archivo que lo reemplaza.',
    });
    expect(draftProblems({ ...error, fileInvalid: true }, 'replace', TODAY)).toEqual({
      file: INVALID_FILE_TEXT,
    });
    expect(draftProblems({ ...error, file: FILE }, 'replace', TODAY)).toEqual({});
  });

  it('limits the note to 500 characters once trimmed', () => {
    const error = draft({ reason: 'UPLOAD_ERROR' });

    expect(draftProblems({ ...error, note: ` ${'a'.repeat(500)} ` }, 'delete', TODAY)).toEqual({});
    expect(draftProblems({ ...error, note: 'a'.repeat(501) }, 'delete', TODAY)).toEqual({
      note: 'La nota admite hasta 500 caracteres.',
    });
  });

  it('sends only what the reason asks for, with the note trimmed or left out', () => {
    expect(
      actionRequest(draft({ reason: 'UPLOAD_ERROR', note: '  ', requestedAt: TODAY })),
    ).toEqual({ reason: 'UPLOAD_ERROR' });
    expect(
      actionRequest(
        draft({ reason: 'ARCO_REQUEST', requestedAt: TODAY, channel: 'WHATSAPP', note: ' ref ' }),
      ),
    ).toEqual({
      reason: 'ARCO_REQUEST',
      requestedAt: TODAY,
      requestChannel: 'WHATSAPP',
      note: 'ref',
    });
  });

  it('words the title, the lead and the button of each action', () => {
    expect(actionTitle('delete', 'dni.jpg')).toBe('¿Borrar dni.jpg?');
    expect(actionTitle('replace', 'dni.jpg')).toBe('Reemplazar dni.jpg');
    expect(actionSubmitLabel('delete', false)).toBe('Borrar documento');
    expect(actionSubmitLabel('delete', true)).toBe('Borrando…');
    expect(actionSubmitLabel('replace', false)).toBe('Reemplazar documento');
    expect(actionSubmitLabel('replace', true)).toBe('Reemplazando…');
  });
});

describe('the problems the BFF answers to a deletion or a replacement', () => {
  it('puts what belongs to a field under it', () => {
    expect(actionProblem(failure(400, 'DOCUMENT_INVALID_FILE', 'file'))).toEqual({
      place: 'field',
      field: 'file',
      message: INVALID_FILE_TEXT,
    });
    for (const field of ['reason', 'requestedAt', 'requestChannel', 'note'] as const) {
      expect(actionProblem(failure(400, 'VALIDATION_ERROR', field))).toEqual(
        expect.objectContaining({ place: 'field', field }),
      );
    }
  });

  it('puts the rest above the buttons, each with its own words', () => {
    const general = (failed: ReturnType<typeof failure>) => actionProblem(failed);

    expect(general(failure(0))).toEqual({
      place: 'general',
      message: 'No se pudo conectar con el servidor. Inténtalo de nuevo.',
    });
    expect(general(failure(429, 'RATE_LIMITED')).message).toBe(
      'Demasiados intentos, espera un momento antes de volver a intentar.',
    );
    expect(general(failure(503, 'FILE_STORAGE_UNAVAILABLE')).message).toBe(
      'No se pudo acceder al archivo; inténtalo de nuevo más tarde.',
    );
    expect(general(failure(404, 'RESOURCE_NOT_FOUND')).message).toContain('ya no está');
    expect(general(failure(415)).message).toContain('Recarga la página');
    expect(general(failure(500)).message).toBe(
      'No se pudo completar la acción. Inténtalo de nuevo.',
    );
    expect(general(failure(400, 'VALIDATION_ERROR', 'otro')).place).toBe('general');
  });
});

describe('the rows of A3.8', () => {
  const document = (fields: Partial<GuestDocument> = {}): GuestDocument => ({
    id: 'd1',
    originalName: 'dni.jpg',
    contentType: 'image/jpeg',
    sizeBytes: 1_258_291,
    uploadedAt: '2026-03-02T15:00:00Z',
    url: 'https://files.example/d1',
    urlExpiresAt: '2026-11-06T15:45:00Z',
    ...fields,
  });

  it('tells what a document is and when it came, today or a day of the year', () => {
    expect(toDocumentRow(document(), NOW).meta).toBe('Imagen JPG · 1.2 MB · subido el 2 mar 2026');
    expect(toDocumentRow(document({ uploadedAt: '2026-11-06T14:00:00Z' }), NOW).meta).toBe(
      'Imagen JPG · 1.2 MB · subido hoy',
    );
    expect(toDocumentRow(document({ uploadedAt: 'no es una fecha' }), NOW).meta).toBe(
      'Imagen JPG · 1.2 MB · subido',
    );
  });

  it('knows when the signed link no longer opens', () => {
    const row = toDocumentRow(document(), NOW);

    expect(isLinkExpired(row, NOW)).toBe(false);
    expect(isLinkExpired(row, new Date('2026-11-06T15:45:00Z'))).toBe(true);
    expect(isLinkExpired({ ...row, urlExpiresAt: 'x' }, NOW)).toBe(true);
  });

  const action = (fields: Partial<GuestDocumentAction> = {}): GuestDocumentAction => ({
    id: 'a1',
    action: 'DELETE',
    documentId: 'd1',
    replacementDocumentId: null,
    reason: 'ARCO_REQUEST',
    requestedAt: '2026-10-27',
    requestChannel: 'WHATSAPP',
    note: 'Mensaje del 27 oct',
    contentType: 'application/pdf',
    sizeBytes: 317_440,
    actorId: 'x1',
    actorName: 'Rosa Quispe',
    performedAt: '2026-11-06T15:05:00Z',
    ...fields,
  });

  it('tells a deletion on request: what, when, who asked how, the note and who did it', () => {
    expect(toActionRow(action(), NOW)).toEqual({
      id: 'a1',
      title: 'Borrado · lo pidió el titular',
      when: 'hoy a las 10:05',
      detail:
        'PDF, 310 KB. Lo pidió por WhatsApp el 27 oct 2026 · Mensaje del 27 oct. Lo hizo Rosa Quispe.',
    });
  });

  it('tells a replacement for an upload error without date or channel, and without a name', () => {
    const row = toActionRow(
      action({
        action: 'REPLACE',
        reason: 'UPLOAD_ERROR',
        requestedAt: null,
        requestChannel: null,
        note: null,
        contentType: 'image/jpeg',
        sizeBytes: 4_718_592,
        actorName: undefined,
        performedAt: '2026-10-20T15:00:00Z',
      }),
      NOW,
    );

    expect(row.title).toBe('Reemplazado · error de carga');
    expect(row.when).toBe('el 20 oct 2026 a las 10:00');
    expect(row.detail).toBe('JPG, 4.5 MB. Error de carga.');
  });
});
