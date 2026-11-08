import { fileMeta, fileSize, toDocumentRows, uploadedText, uploadProblem } from './file-text';

const failure = (status: number, code: string | null = null, field: string | null = null) => ({
  status,
  code,
  field,
  body: {},
});

describe('the text of a file', () => {
  it('writes the size in KB below 1 MB, never less than 1, and in MB with one decimal', () => {
    expect(fileSize(500)).toBe('1 KB');
    expect(fileSize(317_440)).toBe('310 KB');
    expect(fileSize(1_258_291)).toBe('1.2 MB');
  });

  it('names the kind of the three types the BFF accepts and any other as a file', () => {
    expect(fileMeta('image/jpeg', 1_258_291)).toBe('Imagen JPG · 1.2 MB');
    expect(fileMeta('image/png', 2_048)).toBe('Imagen PNG · 2 KB');
    expect(fileMeta('application/pdf', 240 * 1024)).toBe('PDF · 240 KB');
    expect(fileMeta('text/plain', 1024)).toBe('Archivo · 1 KB');
  });

  it('says when it was uploaded: today, a day of the year, or nothing known', () => {
    const now = new Date('2026-11-06T15:00:00Z');
    expect(uploadedText('2026-11-06T14:00:00Z', now)).toBe('subido hoy');
    expect(uploadedText('2026-03-02T15:00:00Z', now)).toBe('subido el 2 mar 2026');
    expect(uploadedText('no', now)).toBe('subido');
  });

  it('puts an invalid file and the limit under the file, and the rest in a toast', () => {
    expect(uploadProblem(failure(400, 'DOCUMENT_INVALID_FILE', 'file'), 5)).toEqual({
      place: 'file',
      message: 'Archivo inválido — sube JPG, PNG o PDF de máx. 5MB',
    });
    expect(uploadProblem(failure(409, 'DOCUMENT_LIMIT_REACHED'), 5)).toEqual({
      place: 'file',
      message: 'Ya subiste el máximo de 5 documentos',
    });
    expect(uploadProblem(failure(503, 'FILE_STORAGE_UNAVAILABLE'), 5)).toEqual({
      place: 'toast',
      message: 'No se pudo acceder al archivo; inténtalo de nuevo más tarde.',
    });
    expect(uploadProblem(failure(429), 5).message).toContain('Demasiados intentos');
    expect(uploadProblem(failure(0), 5).message).toContain('No se pudo conectar');
    expect(uploadProblem(failure(500), 5).message).toBe(
      'No se pudo subir el documento. Inténtalo de nuevo.',
    );
  });

  it('names each one by its kind, size and the day it was uploaded', () => {
    const now = new Date('2026-11-06T15:00:00Z');

    expect(
      toDocumentRows(
        [
          {
            id: 'd1',
            originalName: 'dni.jpg',
            contentType: 'image/jpeg',
            sizeBytes: 1_258_291,
            uploadedAt: '2026-03-02T15:00:00Z',
          },
        ],
        now,
      ),
    ).toEqual([{ id: 'd1', name: 'dni.jpg', meta: 'Imagen JPG · 1.2 MB · subido el 2 mar 2026' }]);
  });
});
