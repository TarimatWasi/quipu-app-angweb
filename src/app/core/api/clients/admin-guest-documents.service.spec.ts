import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { BFF_BASE_URL } from '@core/config/bff-base-url';
import { AdminGuestDocumentsService } from './admin-guest-documents.service';
import type { GuestDocumentAction } from './admin-guest-documents.service';

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: BFF_BASE_URL, useValue: '' },
    ],
  });
  return {
    service: TestBed.inject(AdminGuestDocumentsService),
    http: TestBed.inject(HttpTestingController),
  };
}

function action(id: string): GuestDocumentAction {
  return {
    id,
    action: 'DELETE',
    documentId: 'd1',
    replacementDocumentId: null,
    reason: 'UPLOAD_ERROR',
    requestedAt: null,
    requestChannel: null,
    note: null,
    contentType: 'application/pdf',
    sizeBytes: 10,
    actorId: 'a1',
    performedAt: '2026-11-06T15:00:00Z',
  };
}

describe('AdminGuestDocumentsService (A3.8)', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('reads the documents of a guest with the id escaped', async () => {
    const { service, http } = setup();

    const done = firstValueFrom(service.list('g/1?x'));
    const req = http.expectOne('/bff/admin/guests/g%2F1%3Fx/documents');
    expect(req.request.method).toBe('GET');
    req.flush([]);

    await expect(done).resolves.toEqual([]);
  });

  it('walks the pages of the evidence with the largest size until there is no cursor', async () => {
    const { service, http } = setup();

    const done = firstValueFrom(service.allActions('g1'));
    const first = http.expectOne((r) => r.url === '/bff/admin/guests/g1/document-actions');
    expect(first.request.params.get('limit')).toBe('100');
    expect(first.request.params.has('after')).toBe(false);
    first.flush({ content: [action('1')], nextCursor: 'c2' });
    // The cursor goes back exactly as the BFF gave it.
    const second = http.expectOne((r) => r.url === '/bff/admin/guests/g1/document-actions');
    expect(second.request.params.get('after')).toBe('c2');
    second.flush({ content: [action('2')], nextCursor: null });

    await expect(done).resolves.toEqual([action('1'), action('2')]);
  });

  it('deletes with a JSON POST that carries only the fields of the reason', async () => {
    const { service, http } = setup();
    const request = {
      reason: 'ARCO_REQUEST',
      requestedAt: '2026-11-05',
      requestChannel: 'WHATSAPP',
    } as const;

    const done = firstValueFrom(service.delete('g1', 'd/1', request), { defaultValue: null });
    const req = http.expectOne('/bff/admin/guests/g1/documents/d%2F1/deletion');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(null, { status: 204, statusText: 'No Content' });

    await expect(done).resolves.toBeNull();
  });

  it('replaces with a multipart PUT: the file and only the fields that were given', async () => {
    const { service, http } = setup();
    const file = new File(['bytes'], 'dni.jpg', { type: 'image/jpeg' });

    const done = firstValueFrom(service.replace('g1', 'd1', file, { reason: 'UPLOAD_ERROR' }));
    const req = http.expectOne('/bff/admin/guests/g1/documents/d1');
    expect(req.request.method).toBe('PUT');
    const body = req.request.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect([...body.keys()].sort()).toEqual(['file', 'reason']);
    expect(body.get('reason')).toBe('UPLOAD_ERROR');
    expect((body.get('file') as File).name).toBe('dni.jpg');
    req.flush({ id: 'd2' });

    await expect(done).resolves.toEqual({ id: 'd2' });
  });
});
