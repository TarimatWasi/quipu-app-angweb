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
        { path: 'admin/payments/new', children: [] },
        { path: 'admin/payments/:id', children: [] },
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

const squash = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim();

function facts(region: HTMLElement): string[][] {
  return [...region.querySelectorAll('dl > div')].map((pair) => [
    squash(pair.querySelector('dt')?.textContent),
    squash(pair.querySelector('dd')?.textContent),
  ]);
}

/** Each stay card: its dates, environment and nights, amount, payment badge and actions. */
function cards(list: HTMLElement): string[][] {
  return [...list.querySelectorAll(':scope > li')].map((card) => [
    squash(card.querySelector('.when strong')?.textContent),
    squash(card.querySelector('.when .sub')?.textContent),
    squash(card.querySelector('.amount')?.textContent),
    squash(card.querySelector('.badge')?.textContent),
    ...[...card.querySelectorAll('.acts a')].map((link) => squash(link.textContent)),
  ]);
}

describe('GuestDetailComponent (A3.2 minimal, approved canvas)', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('shows the header, its facts and the stays of an active temporary guest', async () => {
    const { page, http, expect1, flush, click } = await setup();
    const req = await expect1(isStays('g1'));
    expect(req.request.params.get('limit')).toBe('20');
    expect(req.request.params.has('after')).toBe(false);
    await flush(req, {
      content: [
        stayOf({ paymentStatus: 'UNDER_REVIEW', paymentId: 'pay/1' }),
        stayOf({
          id: 's/2',
          environmentId: null,
          environmentCode: null,
          startDate: '2026-06-02',
          endDate: '2026-06-09',
          agreedAmount: 300,
          paymentStatus: 'PAID',
          paymentId: 'p2',
        }),
      ],
      nextCursor: 'next+1/==',
    });

    expect(page().getByRole('heading', { level: 1, name: 'Luis Mamani' })).toBeTruthy();
    expect(page().getByText(/^Hoy, \S+ \d{1,2} de \S+$/)).toBeTruthy();
    expect(page().getByRole('link', { name: 'Volver a Pagos' }).getAttribute('href')).toBe(
      '/admin/payments',
    );
    const data = page().getByRole('region', { name: 'Sus datos' });
    expect(facts(data)).toEqual([
      ['Documento', 'DNI 12345678'],
      ['Estado', 'Activo'],
      ['Tipo', 'Temporal'],
    ]);
    expect(data.querySelector('.badge')?.className).toContain('tone-ok');
    const region = page().getByRole('region', { name: 'Estadías' });
    const list = within(region).getByRole('list');
    expect(cards(list)).toEqual([
      [
        '10 – 15 nov 2026',
        'H1 · 5 noches',
        'S/ 400.00',
        'Pendiente de revisión',
        'Revisar pago de la estadía del 10 – 15 nov 2026',
        'Corregir estadía del 10 – 15 nov 2026',
      ],
      [
        '2 – 9 jun 2026',
        'Sin ambiente · 7 noches',
        'S/ 300.00',
        'Pagado',
        'Ver pago de la estadía del 2 – 9 jun 2026',
        'Corregir estadía del 2 – 9 jun 2026',
      ],
    ]);
    expect(
      within(region).getByText(
        'De la más reciente a la más antigua. Cada estadía tiene un solo pago.',
      ),
    ).toBeTruthy();
    expect(
      within(region).getByRole('link', { name: 'Registrar estadía' }).getAttribute('href'),
    ).toBe('/admin/guests/g1/stays/new');
    const fix = within(region).getAllByRole('link', { name: /^Corregir estadía/ });
    expect(fix.map((link) => link.getAttribute('href'))).toEqual([
      '/admin/guests/g1/stays/s1',
      '/admin/guests/g1/stays/s%2F2',
    ]);
    const pay = within(region).getAllByRole('link', { name: /pago de la estadía/ });
    expect(pay.map((link) => link.getAttribute('href'))).toEqual([
      '/admin/payments/pay%2F1',
      '/admin/payments/p2',
    ]);
    expect(page().queryByRole('link', { name: 'Corregir documento' })).toBeNull();

    await click(within(region).getByRole('button', { name: 'Cargar más estadías' }));
    const more = await expect1(isStays('g1'));
    expect(more.request.params.get('after')).toBe('next+1/==');
    await flush(more, {
      content: [
        stayOf({ id: 's3', environmentCode: 'C2', paymentStatus: 'OVERDUE' }),
        stayOf({ id: 's4', paymentStatus: 'UNPAID', paymentId: 'rejected/1' }),
      ],
      nextCursor: null,
    });

    const all = cards(list);
    expect(all.map((card) => card[1])).toEqual([
      'H1 · 5 noches',
      'Sin ambiente · 7 noches',
      'C2 · 5 noches',
      'H1 · 5 noches',
    ]);
    expect(all[2]?.slice(3, 5)).toEqual([
      'Atrasado',
      'Registrar pago de la estadía del 10 – 15 nov 2026',
    ]);
    expect(all[3]?.[4]).toBe('Corregir pago de la estadía del 10 – 15 nov 2026');
    const register = within(region).getAllByRole('link', { name: /^Registrar pago/ })[0];
    expect(register?.getAttribute('href')).toBe('/admin/payments/new?guestId=g1');
    expect(list.querySelectorAll('.badge')[2]?.className).toContain('tone-bad');
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
    expect(within(region).queryByRole('list')).toBeNull();
    expect(within(region).getByRole('link', { name: 'Registrar estadía' })).toBeTruthy();
  });

  it('keeps the history of an inactive temporary guest without "Registrar estadía"', async () => {
    const { page, expect1, flush } = await setup(
      guestDetail({ status: 'INACTIVE', onboardingProgress: 'COMPLETED' }),
    );
    await flush(await expect1(isStays('g1')), { content: [stayOf()], nextCursor: null });

    const region = page().getByRole('region', { name: 'Estadías' });
    expect(within(region).getAllByRole('listitem')).toHaveLength(1);
    expect(within(region).queryByRole('link', { name: 'Registrar estadía' })).toBeNull();
    expect(page().getByText('Inactivo').className).toContain('tone-none');
  });

  it('says a temporary guest still activating takes no stay, and offers to correct its document', async () => {
    const { page, http } = await setup(
      guestDetail({
        name: null,
        status: 'PENDING_ACTIVATION',
        onboardingProgress: 'NOT_STARTED',
        version: 3,
        documentType: 'PASSPORT',
        documentNumber: 'X-1',
      }),
    );

    expect(page().getByRole('heading', { level: 1, name: 'Pasaporte X-1' })).toBeTruthy();
    expect(page().getByText('Pendiente de activación').className).toContain('tone-wait');
    expect(page().queryByRole('region', { name: 'Estadías' })).toBeNull();
    const blocked = page().getByRole('region', { name: 'Estadías y pagos' });
    expect(blocked.textContent).toContain('Primero tiene que activar su cuenta.');
    expect(squash(blocked.textContent)).toContain(
      'Hasta que termine su registro no se le puede registrar una estadía ni pagos.',
    );
    expect(
      page().getByText('Su nombre y sus datos los completa el huésped al activar su acceso.'),
    ).toBeTruthy();
    expect(page().getByRole('link', { name: 'Corregir documento' }).getAttribute('href')).toBe(
      '/admin/guests/g1/document',
    );
    expect(page().getByText('solo hasta que active su acceso')).toBeTruthy();
    http.expectNone(isStays('g1'));
  });

  it('shows the error of the load as the canvas words it and retries', async () => {
    const { page, click, expect1, flush } = await setup(
      { code: 'UNEXPECTED_ERROR', message: 'El servidor no responde' },
      500,
    );

    const alert = page().getByRole('alert');
    expect(squash(alert.querySelector('strong')?.textContent)).toBe(
      'No se pudo cargar el huésped.',
    );
    expect(alert.textContent).not.toContain('El servidor no responde');
    await click(within(alert).getByRole('button', { name: 'Reintentar' }));
    await flush(await expect1(isGuest('g1')), guestDetail({ type: 'CONTRACT' }));

    expect(page().queryByRole('alert')).toBeNull();
    expect(page().getByRole('heading', { level: 1, name: 'Luis Mamani' })).toBeTruthy();
  });

  it('replaces the content when the guest does not exist', async () => {
    const { page } = await setup({ code: 'GUEST_NOT_FOUND', message: 'El huésped no existe' }, 404);

    expect(page().getByText('No encontramos a este huésped.')).toBeTruthy();
    const back = page().getAllByRole('link', { name: 'Volver a Pagos' });
    expect(back.map((link) => link.getAttribute('href'))).toEqual([
      '/admin/payments',
      '/admin/payments',
    ]);
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

    expect(within(region).getByRole('list')).toBeTruthy();
  });
});

function present<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error('expected a value');
  }
  return value;
}
