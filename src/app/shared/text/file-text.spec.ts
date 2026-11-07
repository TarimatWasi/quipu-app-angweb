import { fileMeta, fileSize, uploadedText } from './file-text';

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
});
