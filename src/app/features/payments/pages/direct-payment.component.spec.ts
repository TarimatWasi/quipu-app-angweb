import { HttpRequest, provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { fireEvent, screen, within } from '@testing-library/dom';
import type { GuestSummary } from '@core/services/admin-guests.service';
import type { PayablePeriod } from '@core/services/admin-payments.service';
import { DirectPaymentComponent } from './direct-payment.component';

const isGuests = (req: HttpRequest<unknown>) => req.url.endsWith('/bff/admin/guests');
const isGuest = (id: string) => (req: HttpRequest<unknown>) =>
  req.url.endsWith(`/bff/admin/guests/${id}`);
const isPeriods = (id: string) => (req: HttpRequest<unknown>) =>
  req.url.endsWith(`/bff/admin/guests/${id}/payable-periods`);
const isCreate = (req: HttpRequest<unknown>) =>
  req.method === 'POST' && req.url.endsWith('/bff/admin/payments');

function guest(overrides: Partial<GuestSummary> = {}): GuestSummary {
  return {
    id: 'g1',
    documentType: 'DNI',
    documentNumber: '12345678',
    name: 'Ana Quispe',
    type: 'CONTRACT',
    status: 'ACTIVE',
    hasLoginAccess: true,
    ...overrides,
  };
}

function payable(overrides: Partial<PayablePeriod> = {}): PayablePeriod {
  return {
    contractId: 'c1',
    period: '2026-09',
    stayId: null,
    stayStartDate: null,
    stayEndDate: null,
    status: 'UNPAID',
    dueDate: '2026-09-05',
    expectedAmount: 350,
    creditApplied: 0,
    amountDue: 350,
    lastPeriod: false,
    paymentId: null,
    ...overrides,
  };
}

const STAY = payable({
  contractId: null,
  period: null,
  stayId: 'stay/7',
  stayStartDate: '2026-10-20',
  stayEndDate: '2026-10-31',
  dueDate: '2026-10-31',
  expectedAmount: 400,
  amountDue: 400,
  lastPeriod: true,
});

const GUESTS = [
  guest(),
  guest({ id: 'g2', name: 'Luis Mamani', documentNumber: '87654321', type: 'TEMPORARY' }),
];

async function settle(harness: RouterTestingHarness) {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await harness.fixture.whenStable();
}

interface SetupOptions {
  readonly url?: string;
  readonly from?: string;
}

async function setup({ url = '/admin/payments/new', from }: SetupOptions = {}) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'admin/payments', children: [] },
        { path: 'admin/payments/new', component: DirectPaymentComponent },
        { path: 'admin/payments/:id', children: [] },
        { path: 'origin', children: [] },
      ]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
    ],
  });
  const harness = await RouterTestingHarness.create();
  const http = TestBed.inject(HttpTestingController);
  if (from !== undefined) {
    await harness.navigateByUrl(from);
  }
  await harness.navigateByUrl(url);
  const expect1 = async (match: (req: HttpRequest<unknown>) => boolean) =>
    vi.waitFor(() => http.expectOne(match));
  const flush = async (req: TestRequest, body: object | null, status = 200) => {
    req.flush(body, { status, statusText: 'x' });
    await settle(harness);
  };
  const page = () => within(present(harness.routeNativeElement));
  const click = async (element: HTMLElement) => {
    fireEvent.click(element);
    await settle(harness);
  };
  const type = async (element: HTMLElement, value: string) => {
    fireEvent.input(element, { target: { value } });
    await settle(harness);
  };
  const choose = async (element: HTMLElement, value: string) => {
    (element as HTMLSelectElement).value = value;
    fireEvent.change(element);
    await settle(harness);
  };
  const pick = async (element: HTMLElement, file: File) => {
    Object.defineProperty(element, 'files', { value: [file], configurable: true });
    fireEvent.change(element);
    await settle(harness);
  };
  const submit = () => click(page().getByRole('button', { name: 'Registrar pago' }));
  const dialog = () =>
    within(present(document.body.querySelector<HTMLElement>('mat-dialog-container')));
  const proof = (n: number) =>
    within(page().getByRole('group', { name: `Comprobante ${String(n)}` }));
  return { harness, http, page, click, type, choose, pick, submit, dialog, proof, expect1, flush };
}

type Ui = Awaited<ReturnType<typeof setup>>;

/** The picker with its guests, then the guest chosen and its periods answered. */
async function chooseGuest(ui: Ui, id: string, periods: PayablePeriod[]) {
  await ui.flush(await ui.expect1(isGuests), {
    content: GUESTS,
    nextCursor: null,
    pendingActivationCount: 0,
    onboardingCount: 0,
  });
  await ui.choose(ui.page().getByLabelText('Huésped'), id);
  await ui.flush(await ui.expect1(isPeriods(id)), periods);
}

/** The single proof as cash of `amount`. */
async function cash(ui: Ui, amount: string) {
  await ui.click(ui.proof(1).getByLabelText('Efectivo, sin voucher'));
  await ui.type(ui.proof(1).getByLabelText('Monto (S/)'), amount);
}

async function bodyOf(req: TestRequest) {
  const body = req.request.body as FormData;
  const proofs = body.get('proofs') as Blob;
  return {
    keys: [...new Set([...body.keys()])].sort(),
    body,
    proofs: JSON.parse(await proofs.text()) as unknown,
  };
}

describe('DirectPaymentComponent (A5.1)', () => {
  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
    document.body.querySelectorAll('mat-snack-bar-container').forEach((el) => {
      el.remove();
    });
    TestBed.inject(HttpTestingController).verify();
  });

  it('lists every guest to choose from and asks for one before sending anything', async () => {
    const ui = await setup();
    const req = await ui.expect1(isGuests);
    expect(req.request.params.get('status')).toBe('ALL');
    await ui.flush(req, {
      content: GUESTS,
      nextCursor: null,
      pendingActivationCount: 0,
      onboardingCount: 0,
    });

    const options = [...ui.page().getByLabelText('Huésped').querySelectorAll('option')].map(
      (option) => option.textContent.trim(),
    );
    expect(options).toEqual([
      'Elige un huésped',
      'Ana Quispe · 12345678 · Con contrato',
      'Luis Mamani · 87654321 · Temporal',
    ]);

    await ui.submit();

    const select = ui.page().getByLabelText('Huésped');
    expect(select.getAttribute('aria-invalid')).toBe('true');
    expect(ui.page().getByText('Elige un huésped', { selector: 'p' })).toBeTruthy();
    expect(ui.page().queryByRole('link', { name: 'Ana Quispe' })).toBeNull();
    ui.http.expectNone(isCreate);
  });

  it('links the name of the chosen guest to its detail (A3.2)', async () => {
    const ui = await setup();
    await chooseGuest(ui, 'g2', [STAY]);

    expect(ui.page().getByRole('link', { name: 'Luis Mamani' }).getAttribute('href')).toBe(
      '/admin/guests/g2',
    );
    expect(ui.page().queryByRole('link', { name: 'Ana Quispe' })).toBeNull();
  });

  it('asks the next page of guests with the cursor the BFF gave', async () => {
    const ui = await setup();
    await ui.flush(await ui.expect1(isGuests), {
      content: [GUESTS[0]],
      nextCursor: 'cur+1/==',
      pendingActivationCount: 0,
      onboardingCount: 0,
    });

    await ui.click(ui.page().getByRole('button', { name: 'Cargar más huéspedes' }));
    const next = await ui.expect1(isGuests);
    expect(next.request.params.get('after')).toBe('cur+1/==');
    await ui.flush(next, {
      content: [GUESTS[1]],
      nextCursor: null,
      pendingActivationCount: 0,
      onboardingCount: 0,
    });

    expect(ui.page().getByLabelText('Huésped').querySelectorAll('option')).toHaveLength(3);
    expect(ui.page().queryByRole('button', { name: 'Cargar más huéspedes' })).toBeNull();
  });

  it('asks for the period and an amount over 0 with the texts of the SRS', async () => {
    const ui = await setup();
    await chooseGuest(ui, 'g1', [payable()]);

    await ui.submit();

    expect(ui.page().getByLabelText('Período').getAttribute('aria-invalid')).toBe('true');
    expect(ui.page().getByText('Elige el período', { selector: 'p' })).toBeTruthy();
    const amount = ui.proof(1).getByLabelText('Monto (S/)');
    expect(amount.getAttribute('aria-invalid')).toBe('true');
    expect(ui.proof(1).getByText('El monto debe ser mayor a 0')).toBeTruthy();

    await ui.type(amount, '0');
    expect(ui.proof(1).getByText('El monto debe ser mayor a 0')).toBeTruthy();
    ui.http.expectNone(isCreate);
  });

  it('offers only the months without a payment, and sends the one with pending payment to A5.2', async () => {
    const ui = await setup();
    await chooseGuest(ui, 'g1', [
      payable(),
      payable({ period: '2026-10', status: 'OVERDUE', amountDue: 300, creditApplied: 50 }),
      payable({ period: '2026-08', status: 'REJECTED', paymentId: 'pay/rej' }),
    ]);

    const options = [...ui.page().getByLabelText('Período').querySelectorAll('option')].map(
      (option) => option.textContent.trim(),
    );
    expect(options).toEqual([
      'Elige el período',
      'Septiembre 2026 · Por pagar S/ 350.00',
      'Octubre 2026 · Atrasado · Por pagar S/ 300.00',
    ]);
    const link = ui.page().getByRole('link', { name: /Completar en Revisar pago/ });
    expect(link.getAttribute('href')).toBe('/admin/payments/pay%2Frej');
    expect(link.closest('li')?.textContent).toContain('Agosto 2026');
  });

  it('registers a contract month with cash, sends period and no stayId, and returns to A5 with the toast', async () => {
    const ui = await setup();
    await chooseGuest(ui, 'g1', [payable()]);
    await ui.choose(ui.page().getByLabelText('Período'), 'p:2026-09');
    await cash(ui, '350');
    await ui.submit();

    const req = await ui.expect1(isCreate);
    const { keys, body, proofs } = await bodyOf(req);
    expect(keys).toEqual(['guestId', 'period', 'proofs']);
    expect(body.get('guestId')).toBe('g1');
    expect(body.get('period')).toBe('2026-09');
    expect(proofs).toEqual([{ kind: 'CASH', amount: 350 }]);
    await ui.flush(req, { id: 'pay_new', status: 'APPROVED' }, 201);

    expect(TestBed.inject(Router).url).toBe('/admin/payments');
    expect(screen.getByText('Pago de Septiembre 2026 registrado y aprobado.')).toBeTruthy();
  });

  it('registers the stay of a temporary guest with a voucher: stayId, no period, the file at its index', async () => {
    const ui = await setup();
    await chooseGuest(ui, 'g2', [STAY]);
    await ui.choose(ui.page().getByLabelText('Período'), 'id:stay/7');
    const voucher = new File(['png'], 'voucher.png', { type: 'image/png' });
    await ui.pick(ui.proof(1).getByLabelText('Archivo del voucher'), voucher);
    await ui.click(ui.proof(1).getByRole('button', { name: 'Yape' }));
    await ui.type(ui.proof(1).getByLabelText('Monto (S/)'), '400');
    await ui.type(ui.page().getByLabelText('Fecha de recepción (opcional)'), '2026-10-30');
    await ui.submit();

    const req = await ui.expect1(isCreate);
    const { keys, body, proofs } = await bodyOf(req);
    expect(keys).toEqual(['files', 'guestId', 'proofs', 'receivedOn', 'stayId']);
    expect(body.get('stayId')).toBe('stay/7');
    expect(body.get('receivedOn')).toBe('2026-10-30');
    expect(proofs).toEqual([{ kind: 'VOUCHER', amount: 400, method: 'Yape', fileIndex: 0 }]);
    expect((body.getAll('files') as File[]).map((file) => file.name)).toEqual(['voucher.png']);
    await ui.flush(req, { id: 'pay_new', status: 'APPROVED' }, 201);

    expect(screen.getByText('Pago de 20 – 31 oct registrado y aprobado.')).toBeTruthy();
  });

  it('points each voucher to its own file when cash sits between them', async () => {
    const ui = await setup();
    await chooseGuest(ui, 'g1', [payable()]);
    await ui.choose(ui.page().getByLabelText('Período'), 'p:2026-09');
    await ui.pick(
      ui.proof(1).getByLabelText('Archivo del voucher'),
      new File(['a'], 'a.pdf', { type: 'application/pdf' }),
    );
    await ui.type(ui.proof(1).getByLabelText('Monto (S/)'), '100');
    await ui.click(ui.page().getByRole('button', { name: 'Agregar otro comprobante' }));
    await ui.click(ui.proof(2).getByLabelText('Efectivo, sin voucher'));
    await ui.type(ui.proof(2).getByLabelText('Monto (S/)'), '50');
    await ui.click(ui.page().getByRole('button', { name: 'Agregar otro comprobante' }));
    await ui.pick(
      ui.proof(3).getByLabelText('Archivo del voucher'),
      new File(['b'], 'b.jpg', { type: 'image/jpeg' }),
    );
    await ui.type(ui.proof(3).getByLabelText('Monto (S/)'), '200');
    await ui.submit();

    const req = await ui.expect1(isCreate);
    const { body, proofs } = await bodyOf(req);
    expect(proofs).toEqual([
      { kind: 'VOUCHER', amount: 100, fileIndex: 0 },
      { kind: 'CASH', amount: 50 },
      { kind: 'VOUCHER', amount: 200, fileIndex: 1 },
    ]);
    expect((body.getAll('files') as File[]).map((file) => file.name)).toEqual(['a.pdf', 'b.jpg']);
    await ui.flush(req, { id: 'pay_new' }, 201);
  });

  it('does not register a short payment and says how much is missing', async () => {
    const ui = await setup();
    await chooseGuest(ui, 'g1', [payable()]);
    await ui.choose(ui.page().getByLabelText('Período'), 'p:2026-09');
    await cash(ui, '300');
    await ui.submit();

    expect(
      ui.page().getByText('Faltan S/ 50.00 para cubrir lo que corresponde: no se puede registrar.'),
    ).toBeTruthy();
    ui.http.expectNone(isCreate);
  });

  it('refuses a voucher that is not JPG, PNG or PDF, or is over 5 MB, before sending', async () => {
    const ui = await setup();
    await chooseGuest(ui, 'g1', [payable()]);
    const input = ui.proof(1).getByLabelText('Archivo del voucher');

    await ui.pick(input, new File(['x'], 'x.gif', { type: 'image/gif' }));
    expect(
      ui.proof(1).getByText('Archivo inválido — sube JPG, PNG o PDF de máx. 5MB'),
    ).toBeTruthy();
    expect(input.getAttribute('aria-invalid')).toBe('true');

    const big = new File(['x'], 'big.pdf', { type: 'application/pdf' });
    Object.defineProperty(big, 'size', { value: 5 * 1024 * 1024 + 1 });
    await ui.pick(input, big);
    expect(
      ui.proof(1).getByText('Archivo inválido — sube JPG, PNG o PDF de máx. 5MB'),
    ).toBeTruthy();

    await ui.choose(ui.page().getByLabelText('Período'), 'p:2026-09');
    await ui.type(ui.proof(1).getByLabelText('Monto (S/)'), '350');
    await ui.submit();
    ui.http.expectNone(isCreate);
  });

  it('allows at most 5 proofs and says why', async () => {
    const ui = await setup();
    await chooseGuest(ui, 'g1', [payable()]);
    const add = ui.page().getByRole('button', { name: 'Agregar otro comprobante' });
    for (let i = 0; i < 4; i++) {
      await ui.click(add);
    }

    expect(ui.page().getAllByRole('group', { name: /^Comprobante \d$/ })).toHaveLength(5);
    expect((add as HTMLButtonElement).disabled).toBe(true);
    expect(ui.page().getByText('Hasta 5 comprobantes por pago.')).toBeTruthy();
  });

  it('skips the guest picker when a guest comes preselected and returns to where it came from', async () => {
    const ui = await setup({ from: '/origin', url: '/admin/payments/new?guestId=g%2F9' });
    await ui.flush(
      await ui.expect1(isGuest('g%2F9')),
      guest({ id: 'g/9', name: 'Rosa Huamán', documentNumber: '44556677' }),
    );
    await ui.flush(await ui.expect1(isPeriods('g%2F9')), [payable({ period: '2026-07' })]);

    ui.http.expectNone(isGuests);
    expect(ui.page().queryByLabelText('Huésped')).toBeNull();
    const link = ui.page().getByRole('link', { name: 'Rosa Huamán' });
    expect(link.getAttribute('href')).toBe('/admin/guests/g%2F9');
    expect(link.parentElement?.textContent.replace(/\s+/g, ' ').trim()).toBe(
      'Rosa Huamán · 44556677 · Con contrato',
    );

    await ui.choose(ui.page().getByLabelText('Período'), 'p:2026-07');
    await cash(ui, '350');
    await ui.submit();
    const req = await ui.expect1(isCreate);
    expect((req.request.body as FormData).get('guestId')).toBe('g/9');
    await ui.flush(req, { id: 'pay_new' }, 201);

    expect(TestBed.inject(Router).url).toBe('/origin');
    expect(screen.getByText('Pago de Julio 2026 registrado y aprobado.')).toBeTruthy();
  });

  it('paints a field error of the BFF next to its field, with its text', async () => {
    const ui = await setup();
    await chooseGuest(ui, 'g1', [payable()]);
    await ui.choose(ui.page().getByLabelText('Período'), 'p:2026-09');
    await cash(ui, '350');
    await ui.submit();

    await ui.flush(
      await ui.expect1(isCreate),
      {
        code: 'VALIDATION_ERROR',
        message: 'Revisa el monto del comprobante',
        field: 'proofs[0].amount',
      },
      400,
    );

    const amount = ui.proof(1).getByLabelText('Monto (S/)');
    expect(amount.getAttribute('aria-invalid')).toBe('true');
    const describedBy = present(amount.getAttribute('aria-describedby'));
    expect(document.getElementById(describedBy)?.textContent.trim()).toBe(
      'Revisa el monto del comprobante',
    );
    expect(ui.page().queryByRole('alert')).toBeNull();
    expect(TestBed.inject(Router).url).toBe('/admin/payments/new');
  });

  it('paints a stayId error of the BFF under the period', async () => {
    const ui = await setup();
    await chooseGuest(ui, 'g2', [STAY]);
    await ui.choose(ui.page().getByLabelText('Período'), 'id:stay/7');
    await cash(ui, '400');
    await ui.submit();

    await ui.flush(
      await ui.expect1(isCreate),
      { code: 'VALIDATION_ERROR', message: 'La estadía no admite pagos', field: 'stayId' },
      400,
    );

    const select = ui.page().getByLabelText('Período');
    expect(select.getAttribute('aria-invalid')).toBe('true');
    expect(ui.page().getByText('La estadía no admite pagos')).toBeTruthy();
  });

  it('shows a 409 of the BFF in a modal with its message and reloads the periods', async () => {
    const ui = await setup();
    await chooseGuest(ui, 'g1', [payable()]);
    await ui.choose(ui.page().getByLabelText('Período'), 'p:2026-09');
    await cash(ui, '350');
    await ui.submit();

    await ui.flush(
      await ui.expect1(isCreate),
      {
        code: 'PAYMENT_ALREADY_EXISTS_FOR_PERIOD',
        message: 'Ya existe un pago aprobado para este período',
      },
      409,
    );

    expect(ui.dialog().getByText('Ya existe un pago aprobado para este período')).toBeTruthy();
    await ui.click(ui.dialog().getByRole('button', { name: 'Entendido' }));
    await ui.flush(await ui.expect1(isPeriods('g1')), []);

    expect(ui.page().getByText('Este huésped no tiene períodos por pagar.')).toBeTruthy();
    expect(TestBed.inject(Router).url).toBe('/admin/payments/new');
  });

  it('shows GUEST_NOT_ACTIVE in a modal with the BFF text', async () => {
    const ui = await setup();
    await chooseGuest(ui, 'g1', [payable()]);
    await ui.choose(ui.page().getByLabelText('Período'), 'p:2026-09');
    await cash(ui, '350');
    await ui.submit();

    await ui.flush(
      await ui.expect1(isCreate),
      {
        code: 'GUEST_NOT_ACTIVE',
        message: 'Este huésped aún no está activo: no admite contratos ni pagos',
        guestId: 'g1',
      },
      409,
    );

    expect(
      ui.dialog().getByText('Este huésped aún no está activo: no admite contratos ni pagos'),
    ).toBeTruthy();
    await ui.click(ui.dialog().getByRole('button', { name: 'Entendido' }));
    await ui.flush(await ui.expect1(isPeriods('g1')), [payable()]);
  });

  it('shows any other error under the form with the BFF text, keeping what was typed', async () => {
    const ui = await setup();
    await chooseGuest(ui, 'g1', [payable()]);
    await ui.choose(ui.page().getByLabelText('Período'), 'p:2026-09');
    await cash(ui, '350');
    await ui.submit();

    await ui.flush(
      await ui.expect1(isCreate),
      {
        code: 'RATE_LIMITED',
        message: 'Demasiados intentos, espera un momento antes de volver a intentar',
      },
      429,
    );

    expect(ui.page().getByRole('alert').textContent.trim()).toBe(
      'Demasiados intentos, espera un momento antes de volver a intentar',
    );
    expect(ui.proof(1).getByLabelText<HTMLInputElement>('Monto (S/)').value).toBe('350');
  });

  it('on a 404 of the guest after sending, says it with a toast and returns to A5', async () => {
    const ui = await setup();
    await chooseGuest(ui, 'g1', [payable()]);
    await ui.choose(ui.page().getByLabelText('Período'), 'p:2026-09');
    await cash(ui, '350');
    await ui.submit();

    await ui.flush(
      await ui.expect1(isCreate),
      { code: 'GUEST_NOT_FOUND', message: 'El huésped no existe' },
      404,
    );

    expect(TestBed.inject(Router).url).toBe('/admin/payments');
    expect(screen.getByText('El huésped no existe')).toBeTruthy();
  });

  it('does not send twice while the payment is on its way', async () => {
    const ui = await setup();
    await chooseGuest(ui, 'g1', [payable()]);
    await ui.choose(ui.page().getByLabelText('Período'), 'p:2026-09');
    await cash(ui, '350');
    await ui.submit();
    await ui.submit();

    const reqs = ui.http.match(isCreate);
    expect(reqs).toHaveLength(1);
    await ui.flush(present(reqs[0]), { id: 'pay_new' }, 201);
  });

  it('refuses a reception date in the future', async () => {
    const ui = await setup();
    await chooseGuest(ui, 'g1', [payable()]);
    await ui.choose(ui.page().getByLabelText('Período'), 'p:2026-09');
    await cash(ui, '350');
    const date = ui.page().getByLabelText('Fecha de recepción (opcional)');
    await ui.type(date, '2999-01-01');
    await ui.submit();

    expect(date.getAttribute('aria-invalid')).toBe('true');
    expect(ui.page().getByText('La fecha no puede ser posterior a hoy')).toBeTruthy();
    ui.http.expectNone(isCreate);
  });
});

function present<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error('expected a value');
  }
  return value;
}
