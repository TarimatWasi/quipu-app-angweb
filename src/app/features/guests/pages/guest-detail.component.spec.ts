import { HttpRequest, provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { fireEvent, within } from '@testing-library/dom';
import type { Stay } from '@core/services/admin-guests.service';
import { GuestDetailComponent } from './guest-detail.component';

const isGuest = (id: string) => (req: HttpRequest<unknown>) =>
  req.url.endsWith(`/bff/admin/guests/${id}`);
const isStays = (id: string) => (req: HttpRequest<unknown>) =>
  req.url.endsWith(`/bff/admin/guests/${id}/stays`);

function guestDetail(overrides: Partial<Record<string, unknown>> = {}): object {
  return {
    id: 'g1',
    documentType: 'DNI',
    documentNumber: '12345678',
    name: 'Luis Mamani',
    type: 'TEMPORARY',
    hasLoginAccess: true,
    phone: '999 111 222',
    documentCount: 0,
    paymentHistory: [],
    status: 'ACTIVE',
    onboardingProgress: 'COMPLETED',
    ...overrides,
  };
}

function stayOf(overrides: Partial<Stay> = {}): Stay {
  return {
    id: 's1',
    environmentId: 'env-1',
    environmentCode: 'H1',
    startDate: '2026-11-10',
    endDate: '2026-11-15',
    agreedAmount: 400,
    paymentStatus: 'UNPAID',
    paymentId: null,
    version: 1,
    ...overrides,
  };
}

async function settle(harness: RouterTestingHarness) {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await harness.fixture.whenStable();
}

async function setup(detail: object = guestDetail(), status = 200) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'admin/payments', children: [] },
        { path: 'admin/guests/:id', component: GuestDetailComponent },
        { path: 'admin/guests/:id/stays/new', children: [] },
        { path: 'admin/guests/:id/stays/:stayId', children: [] },
        { path: 'admin/guests/:id/document', children: [] },
      ]),
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });
  const harness = await RouterTestingHarness.create();
  const http = TestBed.inject(HttpTestingController);
  await harness.navigateByUrl('/admin/guests/g1');
  const expect1 = async (match: (req: HttpRequest<unknown>) => boolean) =>
    vi.waitFor(() => http.expectOne(match));
  const flush = async (req: TestRequest, body: object | null, code = 200) => {
    req.flush(body, { status: code, statusText: 'x' });
    await settle(harness);
  };
  await flush(await expect1(isGuest('g1')), detail, status);
  const page = () => within(present(harness.routeNativeElement));
  const click = async (element: HTMLElement) => {
    fireEvent.click(element);
    await settle(harness);
  };
  return { harness, http, page, click, expect1, flush };
}

function facts(region: HTMLElement): (string | undefined)[][] {
  return [...region.querySelectorAll('dl > div')].map((pair) => [
    pair.querySelector('dt')?.textContent.trim(),
    pair.querySelector('dd')?.textContent.trim(),
  ]);
}

function rows(table: HTMLElement): string[][] {
  return [...table.querySelectorAll('tbody tr')].map((row) =>
    [...row.querySelectorAll('td')].map((cell) => cell.textContent.trim().replace(/\s+/g, ' ')),
  );
}

describe('GuestDetailComponent (A3.2 minimal)', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('shows the header and the stay history of a temporary guest with its actions', async () => {
    const { page, http, expect1, flush, click } = await setup();
    const req = await expect1(isStays('g1'));
    expect(req.request.params.get('limit')).toBe('20');
    expect(req.request.params.has('after')).toBe(false);
    await flush(req, {
      content: [
        stayOf(),
        stayOf({
          id: 's/2',
          environmentId: null,
          environmentCode: null,
          startDate: '2026-10-20',
          endDate: '2026-10-31',
          agreedAmount: 350.5,
          paymentStatus: 'PAID',
          paymentId: 'p1',
        }),
      ],
      nextCursor: 'next+1/==',
    });

    expect(page().getByRole('heading', { level: 1, name: 'Luis Mamani' })).toBeTruthy();
    expect(facts(present(page().getByRole('heading', { level: 1 }).closest('section')))).toEqual([
      ['Documento', 'DNI 12345678'],
      ['Tipo', 'Temporal'],
      ['Estado', 'Activo'],
    ]);
    const region = page().getByRole('region', { name: 'Estadías' });
    const table = within(region).getByRole('table');
    expect([...table.querySelectorAll('thead th')].map((th) => th.textContent.trim())).toEqual([
      'Ambiente',
      'Fechas',
      'Monto acordado',
      'Pago',
      'Acciones',
    ]);
    expect(rows(table)).toEqual([
      ['H1', '10 – 15 nov', 'S/ 400.00', 'No pagado', 'Corregir estadía del 10 – 15 nov'],
      ['Sin ambiente', '20 – 31 oct', 'S/ 350.50', 'Pagado', 'Corregir estadía del 20 – 31 oct'],
    ]);
    expect(
      within(region).getByRole('link', { name: 'Registrar estadía' }).getAttribute('href'),
    ).toBe('/admin/guests/g1/stays/new');
    const fix = within(region).getAllByRole('link', { name: /^Corregir/ });
    expect(fix.map((link) => link.getAttribute('href'))).toEqual([
      '/admin/guests/g1/stays/s1',
      '/admin/guests/g1/stays/s%2F2',
    ]);
    expect(page().queryByRole('link', { name: 'Corregir documento' })).toBeNull();

    await click(within(region).getByRole('button', { name: 'Cargar más estadías' }));
    const more = await expect1(isStays('g1'));
    expect(more.request.params.get('after')).toBe('next+1/==');
    await flush(more, {
      content: [stayOf({ id: 's3', environmentCode: 'C2', paymentStatus: 'OVERDUE' })],
      nextCursor: null,
    });

    expect(rows(table).map((row) => row[0])).toEqual(['H1', 'Sin ambiente', 'C2']);
    expect(rows(table)[2]?.[3]).toBe('Atrasado');
    expect(within(region).queryByRole('button', { name: 'Cargar más estadías' })).toBeNull();
    http.expectNone(isStays('g1'));
  });

  it('shows no stay section and asks no stays for a guest with a contract', async () => {
    const { page, http } = await setup(guestDetail({ type: 'CONTRACT', name: 'Ana Quispe' }));

    expect(page().getByRole('heading', { level: 1, name: 'Ana Quispe' })).toBeTruthy();
    expect(page().getByText('Con contrato')).toBeTruthy();
    expect(page().queryByRole('region', { name: 'Estadías' })).toBeNull();
    expect(page().queryByRole('link', { name: 'Registrar estadía' })).toBeNull();
    http.expectNone(isStays('g1'));
  });

  it('says so when a temporary guest has no stays yet', async () => {
    const { page, expect1, flush } = await setup();
    await flush(await expect1(isStays('g1')), { content: [], nextCursor: null });

    const region = page().getByRole('region', { name: 'Estadías' });
    expect(within(region).getByText('Aún no tiene estadías registradas.')).toBeTruthy();
    expect(within(region).queryByRole('table')).toBeNull();
    expect(within(region).getByRole('link', { name: 'Registrar estadía' })).toBeTruthy();
  });

  it('offers to correct the document of a guest pending activation, without a name yet', async () => {
    const { page, http } = await setup(
      guestDetail({
        type: 'CONTRACT',
        name: null,
        status: 'PENDING_ACTIVATION',
        onboardingProgress: 'NOT_STARTED',
        version: 3,
        documentType: 'PASSPORT',
        documentNumber: 'X-1',
      }),
    );

    expect(page().getByRole('heading', { level: 1, name: 'Sin nombre aún' })).toBeTruthy();
    expect(page().getByText('Pasaporte X-1')).toBeTruthy();
    expect(page().getByText('Pendiente de activación')).toBeTruthy();
    expect(page().getByRole('link', { name: 'Corregir documento' }).getAttribute('href')).toBe(
      '/admin/guests/g1/document',
    );
    http.expectNone(isStays('g1'));
  });

  it('shows the error of the load with the BFF message and retries', async () => {
    const { page, click, expect1, flush } = await setup(
      { code: 'UNEXPECTED_ERROR', message: 'El servidor no responde' },
      500,
    );

    const alert = page().getByRole('alert');
    expect(alert.textContent).toContain('El servidor no responde');
    await click(within(alert).getByRole('button', { name: 'Reintentar' }));
    await flush(await expect1(isGuest('g1')), guestDetail({ type: 'CONTRACT' }));

    expect(page().queryByRole('alert')).toBeNull();
    expect(page().getByRole('heading', { level: 1, name: 'Luis Mamani' })).toBeTruthy();
  });

  it('replaces the content when the guest does not exist', async () => {
    const { page } = await setup({ code: 'GUEST_NOT_FOUND', message: 'El huésped no existe' }, 404);

    expect(page().getByText('No encontramos al huésped.')).toBeTruthy();
    expect(page().getByRole('link', { name: 'Volver a Pagos' }).getAttribute('href')).toBe(
      '/admin/payments',
    );
    expect(page().queryByRole('heading', { level: 2 })).toBeNull();
  });

  it('shows the error of the stays with a retry, keeping the header', async () => {
    const { page, click, expect1, flush } = await setup();
    await flush(
      await expect1(isStays('g1')),
      { code: 'RATE_LIMITED', message: 'Demasiadas consultas, espera un momento' },
      429,
    );

    const region = page().getByRole('region', { name: 'Estadías' });
    const alert = within(region).getByRole('alert');
    expect(alert.textContent).toContain('Demasiadas consultas, espera un momento');
    expect(page().getByRole('heading', { level: 1, name: 'Luis Mamani' })).toBeTruthy();
    await click(within(alert).getByRole('button', { name: 'Reintentar' }));
    await flush(await expect1(isStays('g1')), { content: [stayOf()], nextCursor: null });

    expect(within(region).getByRole('table')).toBeTruthy();
  });
});

function present<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error('expected a value');
  }
  return value;
}
