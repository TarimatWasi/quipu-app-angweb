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
import type { PeriodStatus } from '@core/services/guest-payments.service';
import type { GuestPayment } from '@core/services/own-payments';
import type { StayPaymentStatus } from '@core/services/temporary-guest-payments.service';
import { OWN_PROOF_LIMIT_TEXT, OwnPaymentComponent, SENT_TEXT } from './own-payment.component';

const isStatus = (req: HttpRequest<unknown>) => req.url.endsWith('/bff/guest/account-status');
const isStay = (req: HttpRequest<unknown>) =>
  req.url.endsWith('/bff/temporary-guest/payment-status');
const isGuestUpload = (req: HttpRequest<unknown>) =>
  req.method === 'POST' && req.url.endsWith('/bff/guest/payments');
const isStayUpload = (req: HttpRequest<unknown>) =>
  req.method === 'POST' && req.url.endsWith('/bff/temporary-guest/payments');
const isGet = (base: string, id: string) => (req: HttpRequest<unknown>) =>
  req.method === 'GET' && req.url.endsWith(`/bff/${base}/payments/${id}`);
const isPut = (base: string, id: string) => (req: HttpRequest<unknown>) =>
  req.method === 'PUT' && req.url.endsWith(`/bff/${base}/payments/${id}`);

function period(overrides: Partial<PeriodStatus> = {}): PeriodStatus {
  return {
    period: '2026-09',
    status: 'UNPAID',
    dueDate: '2026-09-05',
    amount: 350,
    creditApplied: 0,
    amountDue: 350,
    contractId: 'c1',
    paymentId: null,
    rejectionReason: null,
    ...overrides,
  };
}

const PERIODS = [
  period({ period: '2026-08', status: 'PAID', paymentId: 'pay_paid' }),
  period({ period: '2026-09', status: 'OVERDUE', paymentId: 'pay_rej', rejectionReason: 'x' }),
  period({ period: '2026-10', status: 'OVERDUE' }),
  period({ period: '2026-11', status: 'UNPAID', creditApplied: 50, amountDue: 300 }),
  period({ period: '2026-12', status: 'UNDER_REVIEW', paymentId: 'pay_rev' }),
];

function stay(overrides: Partial<StayPaymentStatus> = {}): StayPaymentStatus {
  return {
    stayId: 'stay1',
    startDate: '2026-10-20',
    endDate: '2026-10-31',
    status: 'UNPAID',
    agreedAmount: 400,
    paymentId: null,
    rejectionReason: null,
    surplus: null,
    ...overrides,
  };
}

function payment(overrides: Partial<GuestPayment> = {}): GuestPayment {
  return {
    id: 'pay/7',
    contractId: 'c1',
    stayId: null,
    period: '2026-09',
    status: 'REJECTED',
    amount: 300,
    verifiedAmount: null,
    creditApplied: 0,
    amountDue: 350,
    rejectionReason: 'El monto no coincide',
    submittedAt: '2026-09-04T15:00:00Z',
    createdAt: '2026-09-04T15:00:00Z',
    proofs: [
      {
        id: 'proof-a',
        kind: 'VOUCHER',
        method: 'Yape',
        declaredAmount: 300,
        verifiedAmount: null,
        uploadedBy: 'GUEST',
        addedAt: '2026-09-04T15:00:00Z',
        file: { name: 'yape.png', contentType: 'image/png', sizeBytes: 1000 },
      },
    ],
    reviews: [],
    ...overrides,
  };
}

async function settle(harness: RouterTestingHarness) {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await harness.fixture.whenStable();
}

async function setup(url: string) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'home', children: [] },
        {
          path: 'guest/payments/new',
          component: OwnPaymentComponent,
          data: { audience: 'CONTRACT' },
        },
        {
          path: 'guest/payments/:id',
          component: OwnPaymentComponent,
          data: { audience: 'CONTRACT' },
        },
        {
          path: 'temporary-guest/payment',
          component: OwnPaymentComponent,
          data: { audience: 'TEMPORARY' },
        },
        {
          path: 'temporary-guest/payment/:id',
          component: OwnPaymentComponent,
          data: { audience: 'TEMPORARY' },
        },
      ]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
    ],
  });
  const harness = await RouterTestingHarness.create();
  const http = TestBed.inject(HttpTestingController);
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
  const dialog = () =>
    within(present(document.body.querySelector<HTMLElement>('mat-dialog-container')));
  const proof = (n: number) =>
    within(page().getByRole('group', { name: `Comprobante ${String(n)}` }));
  return { harness, http, page, click, type, choose, pick, dialog, proof, expect1, flush };
}

type Ui = Awaited<ReturnType<typeof setup>>;

const voucherFile = () => new File(['%PDF'], 'voucher.pdf', { type: 'application/pdf' });

async function bodyOf(req: TestRequest) {
  const body = req.request.body as FormData;
  const proofs = body.get('proofs') as Blob;
  return {
    keys: [...new Set([...body.keys()])].sort(),
    body,
    proofs: JSON.parse(await proofs.text()) as unknown,
    files: (body.getAll('files') as File[]).map((file) => file.name),
  };
}

const error = (code: string, message: string, field?: string) => ({
  code,
  message,
  ...(field ? { field } : {}),
});

/** H3 opened with the account status answered. */
async function newContractPayment(url = '/guest/payments/new') {
  const ui = await setup(url);
  expect(ui.page().getByRole('status').textContent).toContain('Cargando');
  await ui.flush(await ui.expect1(isStatus), PERIODS);
  return ui;
}

/** The single proof as cash of `amount`. */
async function cash(ui: Ui, n: number, amount: string) {
  await ui.click(ui.proof(n).getByLabelText('Efectivo, sin voucher'));
  await ui.type(ui.proof(n).getByLabelText('Monto (S/)'), amount);
}

const send = (ui: Ui, name = 'Enviar pago') => ui.click(ui.page().getByRole('button', { name }));

describe('OwnPaymentComponent (H3, T2)', () => {
  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
    document.body.querySelectorAll('mat-snack-bar-container').forEach((el) => {
      el.remove();
    });
    TestBed.inject(HttpTestingController).verify();
  });

  describe('H3, a first payment of the guest with a contract', () => {
    it('offers only the months without any payment and links the rejected ones to their correction', async () => {
      const ui = await newContractPayment();

      expect(ui.page().getByRole('heading', { level: 1 }).textContent).toContain('Subir pago');
      const options = [...ui.page().getByLabelText('Mes').querySelectorAll('option')].map(
        (option) => option.textContent.trim(),
      );
      expect(options).toEqual([
        'Elige el período',
        'Octubre 2026 · Atrasado · Por pagar S/ 350.00',
        'Noviembre 2026 · Por pagar S/ 300.00',
      ]);
      const link = ui.page().getByRole('link', { name: 'Corregir pago de Septiembre 2026' });
      expect(link.getAttribute('href')).toBe('/guest/payments/pay_rej');
    });

    it('sends the chosen month with a voucher and cash, then goes home saying it is pending review', async () => {
      const ui = await newContractPayment('/guest/payments/new?period=2026-11');
      expect(ui.page().getByLabelText<HTMLSelectElement>('Mes').value).toBe('2026-11');
      expect(
        ui
          .page()
          .getByText(/Cuota S\/ 350.00/)
          .textContent.trim(),
      ).toBe('Cuota S/ 350.00 · Por pagar S/ 300.00');

      await ui.pick(ui.proof(1).getByLabelText('Archivo del voucher'), voucherFile());
      const shortcuts = within(ui.proof(1).getByRole('group', { name: 'Medios frecuentes' }));
      await ui.click(shortcuts.getByRole('button', { name: 'Yape' }));
      await ui.type(ui.proof(1).getByLabelText('Monto (S/)'), '200');
      await ui.click(ui.page().getByRole('button', { name: 'Agregar otro comprobante' }));
      await cash(ui, 2, '100');
      expect(ui.page().getByRole('status').textContent).toMatch(/Suma S\/ 300.00 · Completo/);

      await send(ui);
      const req = await ui.expect1(isGuestUpload);
      const sent = await bodyOf(req);
      expect(sent.keys).toEqual(['files', 'period', 'proofs']);
      expect(sent.body.get('period')).toBe('2026-11');
      expect(sent.proofs).toEqual([
        { kind: 'VOUCHER', amount: 200, method: 'Yape', fileIndex: 0 },
        { kind: 'CASH', amount: 100 },
      ]);
      expect(sent.files).toEqual(['voucher.pdf']);
      await ui.flush(req, { id: 'pay_new', status: 'PENDING' }, 201);

      expect(TestBed.inject(Router).url).toBe('/home');
      expect(screen.getByText(SENT_TEXT)).toBeTruthy();
    });

    it('says what is left to pay after the credit and compares the sum with it (RN-38)', async () => {
      const ui = await newContractPayment('/guest/payments/new?period=2026-11');

      expect(ui.page().getByRole('note', { name: 'Crédito a favor' }).textContent.trim()).toBe(
        'Se descuentan S/ 50.00 de tu crédito a favor, que sobró de un pago anterior.',
      );
      await cash(ui, 1, '350');
      expect(ui.page().getByRole('status').textContent).toMatch(
        /Suma S\/ 350.00 · Sobran S\/ 50.00/,
      );
      await ui.type(ui.proof(1).getByLabelText('Monto (S/)'), '300');
      expect(ui.page().getByRole('status').textContent).toMatch(/Suma S\/ 300.00 · Completo/);

      await ui.choose(ui.page().getByLabelText('Mes'), '2026-10');
      expect(
        ui
          .page()
          .getByText(/Cuota S\/ 350.00/)
          .textContent.trim(),
      ).toBe('Cuota S/ 350.00 · Por pagar S/ 350.00');
      expect(ui.page().queryByRole('note', { name: 'Crédito a favor' })).toBeNull();
      expect(ui.page().getByRole('status').textContent).toMatch(
        /Suma S\/ 300.00 · Faltan S\/ 50.00/,
      );
    });

    it('asks for the month, the amount and the voucher file before sending anything', async () => {
      const ui = await newContractPayment();

      await send(ui);

      expect(ui.page().getByText('Elige el período', { selector: 'p' })).toBeTruthy();
      expect(ui.page().getByLabelText('Mes').getAttribute('aria-invalid')).toBe('true');
      expect(ui.proof(1).getByText('El monto debe ser mayor a 0')).toBeTruthy();
      expect(ui.proof(1).getByText('Sube el archivo del voucher')).toBeTruthy();
      ui.http.expectNone(isGuestUpload);
    });

    it('rejects a file that is not JPG, PNG or PDF of up to 5 MB before sending it', async () => {
      const ui = await newContractPayment('/guest/payments/new?period=2026-10');

      await ui.pick(
        ui.proof(1).getByLabelText('Archivo del voucher'),
        new File(['x'], 'nota.txt', { type: 'text/plain' }),
      );
      expect(
        ui.proof(1).getByText('Archivo inválido — sube JPG, PNG o PDF de máx. 5MB'),
      ).toBeTruthy();

      const big = new File(['x'], 'grande.pdf', { type: 'application/pdf' });
      Object.defineProperty(big, 'size', { value: 5 * 1024 * 1024 + 1 });
      await ui.pick(ui.proof(1).getByLabelText('Archivo del voucher'), big);
      await ui.type(ui.proof(1).getByLabelText('Monto (S/)'), '350');
      await send(ui);

      expect(
        ui.proof(1).getByText('Archivo inválido — sube JPG, PNG o PDF de máx. 5MB'),
      ).toBeTruthy();
      ui.http.expectNone(isGuestUpload);
    });

    it('gathers up to five proofs and then disables «Agregar otro comprobante»', async () => {
      const ui = await newContractPayment();
      const add = () => ui.page().getByRole('button', { name: 'Agregar otro comprobante' });

      for (let i = 0; i < 4; i++) {
        expect((add() as HTMLButtonElement).disabled).toBe(false);
        await ui.click(add());
      }

      expect(ui.page().getAllByRole('group', { name: /^Comprobante \d$/ })).toHaveLength(5);
      expect((add() as HTMLButtonElement).disabled).toBe(true);
      expect(ui.page().getByText(OWN_PROOF_LIMIT_TEXT)).toBeTruthy();
      expect(OWN_PROOF_LIMIT_TEXT).toBe('Puedes juntar hasta 5 comprobantes.');
      await ui.click(add());
      expect(ui.page().getAllByRole('group', { name: /^Comprobante \d$/ })).toHaveLength(5);
    });

    it.each([
      ['VOUCHER_NO_ACTIVE_CONTRACT', 403, 'No tienes un contrato vigente'],
      ['GUEST_NOT_ACTIVE', 409, 'Tu cuenta no está activa'],
    ])(
      'shows %s in a dialog with the BFF text and stays on the page',
      async (code, status, title) => {
        const ui = await newContractPayment('/guest/payments/new?period=2026-10');
        await cash(ui, 1, '350');
        await send(ui);
        await ui.flush(
          await ui.expect1(isGuestUpload),
          error(code, `Texto del BFF ${code}`),
          status,
        );

        expect(ui.dialog().getByRole('heading', { name: title })).toBeTruthy();
        expect(ui.dialog().getByText(`Texto del BFF ${code}`)).toBeTruthy();
        await ui.click(ui.dialog().getByRole('button', { name: 'Entendido' }));

        ui.http.expectNone(isStatus);
        expect(TestBed.inject(Router).url).toBe('/guest/payments/new?period=2026-10');
      },
    );

    it('shows that the month already has a payment and loads the months again', async () => {
      const ui = await newContractPayment('/guest/payments/new?period=2026-10');
      await cash(ui, 1, '350');
      await send(ui);
      await ui.flush(
        await ui.expect1(isGuestUpload),
        error('VOUCHER_ALREADY_EXISTS', 'Ya enviaste un pago para este período.'),
        409,
      );

      expect(
        ui.dialog().getByRole('heading', { name: 'Este período ya tiene un pago' }),
      ).toBeTruthy();
      expect(ui.dialog().getByText('Ya enviaste un pago para este período.')).toBeTruthy();
      await ui.click(ui.dialog().getByRole('button', { name: 'Entendido' }));

      await ui.flush(await ui.expect1(isStatus), PERIODS);
    });

    it('shows an error of a proof under that proof, with the BFF text', async () => {
      const ui = await newContractPayment('/guest/payments/new?period=2026-10');
      await ui.pick(ui.proof(1).getByLabelText('Archivo del voucher'), voucherFile());
      await ui.type(ui.proof(1).getByLabelText('Monto (S/)'), '300');
      await ui.click(ui.page().getByRole('button', { name: 'Agregar otro comprobante' }));
      await cash(ui, 2, '50');
      await send(ui);
      await ui.flush(
        await ui.expect1(isGuestUpload),
        error('VOUCHER_INVALID_FILE', 'El archivo no es válido.', 'proofs[0].file'),
        400,
      );

      expect(ui.proof(1).getByText('El archivo no es válido.')).toBeTruthy();
      expect(ui.proof(1).getByLabelText('Archivo del voucher').getAttribute('aria-invalid')).toBe(
        'true',
      );
      expect(ui.proof(2).queryByText('El archivo no es válido.')).toBeNull();

      await send(ui);
      await ui.flush(
        await ui.expect1(isGuestUpload),
        error('VALIDATION_ERROR', 'El monto no es válido.', 'proofs[1].amount'),
        400,
      );
      expect(ui.proof(2).getByText('El monto no es válido.')).toBeTruthy();
      expect(ui.proof(1).queryByText('El monto no es válido.')).toBeNull();
    });

    it('shows too many attempts under the form with the BFF text', async () => {
      const ui = await newContractPayment('/guest/payments/new?period=2026-10');
      await cash(ui, 1, '350');
      await send(ui);
      await ui.flush(
        await ui.expect1(isGuestUpload),
        error('RATE_LIMITED', 'Demasiados intentos, espera un momento.'),
        429,
      );

      expect(ui.page().getByRole('alert').textContent).toContain(
        'Demasiados intentos, espera un momento.',
      );
      expect(document.body.querySelector('mat-dialog-container')).toBeNull();
    });

    it('says when there is no month to pay and shows no form', async () => {
      const ui = await setup('/guest/payments/new');
      await ui.flush(await ui.expect1(isStatus), [period({ status: 'PAID', paymentId: 'p' })]);

      expect(ui.page().getByText('No tienes meses por pagar.')).toBeTruthy();
      expect(ui.page().queryByRole('button', { name: 'Enviar pago' })).toBeNull();
    });
  });

  describe('H3, the correction of a rejected payment', () => {
    it('opens with the reason and the proofs sent, and sends them corrected again', async () => {
      const ui = await setup('/guest/payments/pay%2F7');
      await ui.flush(await ui.expect1(isGet('guest', 'pay%2F7')), payment());

      expect(ui.page().getByRole('heading', { level: 1 }).textContent).toContain(
        'Corregir pago de Septiembre 2026',
      );
      expect(ui.page().getByText('Tu pago no se aprobó')).toBeTruthy();
      expect(ui.page().getByText('El monto no coincide')).toBeTruthy();
      expect(ui.proof(1).getByLabelText<HTMLInputElement>('Monto (S/)').value).toBe('300');
      expect(ui.proof(1).getByLabelText<HTMLInputElement>('Medio de pago (opcional)').value).toBe(
        'Yape',
      );
      expect(ui.proof(1).getByText(/yape\.png/)).toBeTruthy();

      await ui.click(ui.page().getByRole('button', { name: 'Agregar otro comprobante' }));
      await cash(ui, 2, '50');
      await send(ui, 'Enviar de nuevo');

      const req = await ui.expect1(isPut('guest', 'pay%2F7'));
      const sent = await bodyOf(req);
      expect(sent.keys).toEqual(['proofs']);
      expect(sent.proofs).toEqual([
        { id: 'proof-a', kind: 'VOUCHER', amount: 300, method: 'Yape' },
        { kind: 'CASH', amount: 50 },
      ]);
      await ui.flush(req, { id: 'pay/7', status: 'PENDING' });

      expect(TestBed.inject(Router).url).toBe('/home');
      expect(screen.getByText(SENT_TEXT)).toBeTruthy();
    });

    it('compares the corrected sum with what is left to pay after the credit (RN-38)', async () => {
      const ui = await setup('/guest/payments/pay%2F7');
      await ui.flush(
        await ui.expect1(isGet('guest', 'pay%2F7')),
        payment({ creditApplied: 50, amountDue: 300 }),
      );

      expect(ui.page().getByText('Por pagar S/ 300.00')).toBeTruthy();
      expect(ui.page().getByRole('note', { name: 'Crédito a favor' }).textContent.trim()).toBe(
        'Se descuentan S/ 50.00 de tu crédito a favor, que sobró de un pago anterior.',
      );
      expect(ui.page().getByRole('status').textContent).toMatch(/Suma S\/ 300.00 · Completo/);
    });

    it('shows no credit note on a correction without credit', async () => {
      const ui = await setup('/guest/payments/pay%2F7');
      await ui.flush(await ui.expect1(isGet('guest', 'pay%2F7')), payment());

      expect(ui.page().getByText('Por pagar S/ 350.00')).toBeTruthy();
      expect(ui.page().queryByRole('note', { name: 'Crédito a favor' })).toBeNull();
      expect(ui.page().getByRole('status').textContent).toMatch(/Faltan S\/ 50.00/);
    });

    it('replaces the file of a kept voucher only when another one is chosen', async () => {
      const ui = await setup('/guest/payments/pay%2F7');
      await ui.flush(await ui.expect1(isGet('guest', 'pay%2F7')), payment());

      await ui.pick(ui.proof(1).getByLabelText('Archivo del voucher'), voucherFile());
      await ui.type(ui.proof(1).getByLabelText('Monto (S/)'), '350');
      await send(ui, 'Enviar de nuevo');

      const req = await ui.expect1(isPut('guest', 'pay%2F7'));
      const sent = await bodyOf(req);
      expect(sent.proofs).toEqual([
        { id: 'proof-a', kind: 'VOUCHER', amount: 350, method: 'Yape', fileIndex: 0 },
      ]);
      expect(sent.files).toEqual(['voucher.pdf']);
      await ui.flush(req, { id: 'pay/7', status: 'PENDING' });
    });

    it('shows «Tu pago ya cambió» when it can no longer be corrected and opens it read-only', async () => {
      const ui = await setup('/guest/payments/pay%2F7');
      await ui.flush(await ui.expect1(isGet('guest', 'pay%2F7')), payment());
      await send(ui, 'Enviar de nuevo');
      await ui.flush(
        await ui.expect1(isPut('guest', 'pay%2F7')),
        error('PAYMENT_NOT_CORRECTABLE', 'Este pago ya no se puede corregir.'),
        409,
      );

      expect(ui.dialog().getByRole('heading', { name: 'Tu pago ya cambió' })).toBeTruthy();
      expect(ui.dialog().getByText('Este pago ya no se puede corregir.')).toBeTruthy();
      await ui.click(ui.dialog().getByRole('button', { name: 'Entendido' }));

      await ui.flush(
        await ui.expect1(isGet('guest', 'pay%2F7')),
        payment({ status: 'APPROVED', rejectionReason: null }),
      );
      expect(ui.page().getByRole('heading', { level: 1 }).textContent).toContain('Tu pago');
      expect(ui.page().getByText('Aprobado')).toBeTruthy();
      expect(ui.page().queryByRole('button', { name: 'Enviar de nuevo' })).toBeNull();
      // An approved payment owes nothing: what it covered is not shown as «Por pagar».
      expect(ui.page().queryByText(/Por pagar/)).toBeNull();
      expect(ui.page().getByText('A cubrir con este pago S/ 350.00')).toBeTruthy();
    });

    it('opens a pending payment read-only, without a form', async () => {
      const ui = await setup('/guest/payments/pay%2F7');
      await ui.flush(
        await ui.expect1(isGet('guest', 'pay%2F7')),
        payment({ status: 'PENDING', rejectionReason: null }),
      );

      expect(ui.page().getByText('Pendiente de revisión')).toBeTruthy();
      expect(ui.page().getByText(/Voucher · yape\.png · Yape · S\/ 300\.00/)).toBeTruthy();
      expect(ui.page().queryByRole('group', { name: 'Comprobante 1' })).toBeNull();
      // A pending payment was already sent: nothing is asked to pay while it is reviewed.
      expect(ui.page().queryByText(/Por pagar/)).toBeNull();
      expect(ui.page().getByText('A cubrir con este pago S/ 350.00')).toBeTruthy();
    });

    it('shows what an approved payment covered and the credit used, never «Por pagar»', async () => {
      const ui = await setup('/guest/payments/pay%2F7');
      await ui.flush(
        await ui.expect1(isGet('guest', 'pay%2F7')),
        payment({ status: 'APPROVED', rejectionReason: null, creditApplied: 50, amountDue: 300 }),
      );

      expect(ui.page().getByText('Aprobado')).toBeTruthy();
      expect(ui.page().queryByText(/Por pagar/)).toBeNull();
      expect(ui.page().getByText('A cubrir con este pago S/ 300.00')).toBeTruthy();
      expect(ui.page().getByRole('note', { name: 'Crédito a favor' }).textContent.trim()).toBe(
        'Se descuentan S/ 50.00 de tu crédito a favor, que sobró de un pago anterior.',
      );
    });

    it('says it found no payment when the id is not the guest’s', async () => {
      const ui = await setup('/guest/payments/otro');
      await ui.flush(
        await ui.expect1(isGet('guest', 'otro')),
        error('RESOURCE_NOT_FOUND', 'No existe.'),
        404,
      );

      expect(ui.page().getByText('No encontramos el pago.')).toBeTruthy();
      expect(ui.page().getAllByRole('link', { name: 'Volver al inicio' }).length).toBeGreaterThan(
        0,
      );
    });
  });

  describe('T2, the payment of the stay of the temporary guest', () => {
    it('sends only the proofs, without a month or a stay, with the agreed amount as help', async () => {
      const ui = await setup('/temporary-guest/payment');
      await ui.flush(await ui.expect1(isStay), stay());

      expect(ui.page().getByRole('heading', { level: 1 }).textContent).toContain(
        'Subir pago de la estadía',
      );
      expect(ui.page().getByText('Monto acordado S/ 400.00')).toBeTruthy();
      expect(ui.page().queryByLabelText('Mes')).toBeNull();
      await ui.pick(ui.proof(1).getByLabelText('Archivo del voucher'), voucherFile());
      await ui.type(ui.proof(1).getByLabelText('Monto (S/)'), '400');
      await send(ui);

      const req = await ui.expect1(isStayUpload);
      const sent = await bodyOf(req);
      expect(sent.keys).toEqual(['files', 'proofs']);
      expect(sent.proofs).toEqual([{ kind: 'VOUCHER', amount: 400, fileIndex: 0 }]);
      await ui.flush(req, { id: 'pay_new', status: 'PENDING' }, 201);

      expect(TestBed.inject(Router).url).toBe('/home');
      expect(screen.getByText(SENT_TEXT)).toBeTruthy();
    });

    it('shows «Ya subiste un voucher para esta estadía» with the BFF text and loads the stay again', async () => {
      const ui = await setup('/temporary-guest/payment');
      await ui.flush(await ui.expect1(isStay), stay());
      await cash(ui, 1, '400');
      await send(ui);
      await ui.flush(
        await ui.expect1(isStayUpload),
        error('VOUCHER_ALREADY_EXISTS', 'Ya enviaste un pago para esta estadía.'),
        409,
      );

      expect(
        ui.dialog().getByRole('heading', { name: 'Ya subiste un voucher para esta estadía' }),
      ).toBeTruthy();
      expect(ui.dialog().getByText('Ya enviaste un pago para esta estadía.')).toBeTruthy();
      await ui.click(ui.dialog().getByRole('button', { name: 'Entendido' }));

      await ui.flush(
        await ui.expect1(isStay),
        stay({ status: 'UNDER_REVIEW', paymentId: 'pay_t' }),
      );
      expect(ui.page().queryByRole('button', { name: 'Enviar pago' })).toBeNull();
      expect(ui.page().getByRole('link', { name: 'Ver pago' }).getAttribute('href')).toBe(
        '/temporary-guest/payment/pay_t',
      );
    });

    it('shows a stay without a stay in force in a dialog', async () => {
      const ui = await setup('/temporary-guest/payment');
      await ui.flush(await ui.expect1(isStay), stay());
      await cash(ui, 1, '400');
      await send(ui);
      await ui.flush(
        await ui.expect1(isStayUpload),
        error('VOUCHER_NO_ACTIVE_STAY', 'No tienes una estadía vigente ni próxima.'),
        403,
      );

      expect(
        ui.dialog().getByRole('heading', { name: 'No tienes una estadía vigente' }),
      ).toBeTruthy();
      expect(ui.dialog().getByText('No tienes una estadía vigente ni próxima.')).toBeTruthy();
    });

    it('sends a stay whose payment was rejected to its correction instead of a new payment', async () => {
      const ui = await setup('/temporary-guest/payment');
      await ui.flush(
        await ui.expect1(isStay),
        stay({ status: 'OVERDUE', paymentId: 'pay_r', rejectionReason: 'No se lee' }),
      );

      expect(ui.page().queryByRole('button', { name: 'Enviar pago' })).toBeNull();
      expect(ui.page().getByRole('link', { name: 'Corregir pago' }).getAttribute('href')).toBe(
        '/temporary-guest/payment/pay_r',
      );
    });

    it('corrects the rejected payment of the stay with its own operation', async () => {
      const ui = await setup('/temporary-guest/payment/pay_r');
      await ui.flush(
        await ui.expect1(isGet('temporary-guest', 'pay_r')),
        payment({
          id: 'pay_r',
          contractId: null,
          period: null,
          stayId: 'stay1',
          stayStartDate: '2026-10-20',
          stayEndDate: '2026-10-31',
          amountDue: 400,
          proofs: [
            {
              id: 'proof-c',
              kind: 'CASH',
              declaredAmount: 300,
              verifiedAmount: null,
              uploadedBy: 'GUEST',
              addedAt: '2026-10-21T15:00:00Z',
              file: null,
            },
          ],
        }),
      );

      expect(ui.page().getByRole('heading', { level: 1 }).textContent).toContain(
        'Corregir pago de 20 – 31 oct',
      );
      await ui.type(ui.proof(1).getByLabelText('Monto (S/)'), '400');
      await send(ui, 'Enviar de nuevo');

      const req = await ui.expect1(isPut('temporary-guest', 'pay_r'));
      expect((await bodyOf(req)).proofs).toEqual([{ id: 'proof-c', kind: 'CASH', amount: 400 }]);
      await ui.flush(req, { id: 'pay_r', status: 'PENDING' });
      expect(TestBed.inject(Router).url).toBe('/home');
    });

    it('shows the BFF text when the guest has no stay yet', async () => {
      const ui = await setup('/temporary-guest/payment');
      await ui.flush(
        await ui.expect1(isStay),
        error('RESOURCE_NOT_FOUND', 'Aún no tienes una estadía registrada.'),
        404,
      );

      expect(ui.page().getByText('Aún no tienes una estadía registrada.')).toBeTruthy();
      expect(ui.page().queryByRole('button', { name: 'Enviar pago' })).toBeNull();
    });
  });
});

function present<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error('expected the element to be on the page');
  }
  return value;
}
