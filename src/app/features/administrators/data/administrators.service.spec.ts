import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Injector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { BFF_BASE_URL } from '@core/config/bff-base-url';
import type { AdministratorSummary } from '../model/administrator';
import { AdministratorsService } from './administrators.service';

const BASE = 'https://bff.example.test';
const ROSA: AdministratorSummary = {
  id: 'a/1',
  name: 'Rosa Quispe',
  documentType: 'DNI',
  documentNumber: '*****678',
  email: 'rosa@example.com',
  status: 'ACTIVE',
  createdAt: '2026-01-15T14:00:00Z',
  self: true,
};

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: BFF_BASE_URL, useValue: BASE },
    ],
  });
  return {
    service: TestBed.inject(AdministratorsService),
    backend: TestBed.inject(HttpTestingController),
  };
}

describe('AdministratorsService (A7)', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('reads the list with a GET of /bff/admin/administrators and reads it again on reload', async () => {
    const { service, backend } = setup();
    const list = runInInjectionContext(TestBed.inject(Injector), () => service.list());
    TestBed.tick();

    const first = backend.expectOne(`${BASE}/bff/admin/administrators`);
    expect(first.request.method).toBe('GET');
    expect(first.request.body).toBeNull();
    first.flush([ROSA]);
    await vi.waitFor(() => {
      expect(list.value()).toEqual([ROSA]);
    });

    list.reload();
    TestBed.tick();
    backend.expectOne(`${BASE}/bff/admin/administrators`).flush([]);
    await vi.waitFor(() => {
      expect(list.value()).toEqual([]);
    });
  });

  it('creates with a POST carrying exactly the document, the email and the password', async () => {
    const { service, backend } = setup();
    const input = {
      documentType: 'CE' as const,
      documentNumber: '001234567',
      email: 'nuevo@example.com',
      currentPassword: 'Clave2026',
    };

    const created = firstValueFrom(service.create(input));
    const req = backend.expectOne(`${BASE}/bff/admin/administrators`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(input);
    req.flush({ id: 'new-1', emailSent: false }, { status: 201, statusText: 'Created' });

    await expect(created).resolves.toEqual({ id: 'new-1', emailSent: false });
  });

  it('deactivates and reactivates with a POST to the escaped id and only the password in the body', async () => {
    const { service, backend } = setup();

    const deactivated = firstValueFrom(service.deactivate('a/1', 'Clave2026'), {
      defaultValue: 'none',
    });
    const off = backend.expectOne(`${BASE}/bff/admin/administrators/a%2F1/deactivate`);
    expect(off.request.method).toBe('POST');
    expect(off.request.body).toEqual({ currentPassword: 'Clave2026' });
    off.flush(null, { status: 204, statusText: 'No Content' });
    await expect(deactivated).resolves.toBeUndefined();

    const reactivated = firstValueFrom(service.reactivate('a/1', 'Otra2026'), {
      defaultValue: 'none',
    });
    const on = backend.expectOne(`${BASE}/bff/admin/administrators/a%2F1/reactivate`);
    expect(on.request.method).toBe('POST');
    expect(on.request.body).toEqual({ currentPassword: 'Otra2026' });
    on.flush(null, { status: 204, statusText: 'No Content' });
    await expect(reactivated).resolves.toBeUndefined();
  });
});
