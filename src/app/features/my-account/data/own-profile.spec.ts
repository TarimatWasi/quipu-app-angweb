import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { BFF_BASE_URL } from '@core/config/bff-base-url';
import { GuestProfileService } from './guest-profile.service';
import type { OwnProfileClient } from './own-profile';
import { TemporaryGuestProfileService } from './temporary-guest-profile.service';

const SERVICES: readonly (readonly [string, Type<OwnProfileClient>, string])[] = [
  ['the guest with a contract (H5)', GuestProfileService, '/bff/guest'],
  ['the temporary guest (T3)', TemporaryGuestProfileService, '/bff/temporary-guest'],
];

function setup(service: Type<OwnProfileClient>) {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: BFF_BASE_URL, useValue: '' },
    ],
  });
  return { client: TestBed.inject(service), http: TestBed.inject(HttpTestingController) };
}

describe.each(SERVICES)('the own profile of %s', (_who, service, base) => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('reads the profile from its own path, with no guest id', async () => {
    const { client, http } = setup(service);

    const done = firstValueFrom(client.profile());
    const req = http.expectOne(`${base}/profile`);
    expect(req.request.method).toBe('GET');
    req.flush({ name: 'Ana' });

    await expect(done).resolves.toEqual({ name: 'Ana' });
  });

  it('patches only what it is given', async () => {
    const { client, http } = setup(service);

    const done = firstValueFrom(client.update({ phone: '987 654 321' }));
    const req = http.expectOne(`${base}/profile`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ phone: '987 654 321' });
    req.flush({ id: 'g1' });

    await expect(done).resolves.toEqual({ id: 'g1' });
  });

  it('uploads a document as multipart with only the file', async () => {
    const { client, http } = setup(service);
    const file = new File(['x'], 'constancia.pdf', { type: 'application/pdf' });

    const done = firstValueFrom(client.upload(file));
    const req = http.expectOne(`${base}/documents`);
    expect(req.request.method).toBe('POST');
    const body = req.request.body as FormData;
    expect([...body.keys()]).toEqual(['file']);
    expect((body.get('file') as File).name).toBe('constancia.pdf');
    req.flush({ id: 'd1' }, { status: 201, statusText: 'Created' });

    await expect(done).resolves.toEqual({ id: 'd1' });
  });

  it('asks for the link of one document with its id escaped', async () => {
    const { client, http } = setup(service);

    const done = firstValueFrom(client.document('d/1?x'));
    const req = http.expectOne(`${base}/documents/d%2F1%3Fx`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'd/1?x', url: 'https://files.example/d' });

    await expect(done).resolves.toEqual(
      expect.objectContaining({ url: 'https://files.example/d' }),
    );
  });
});
