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
import type { AdminProof, PaymentDetail } from '@core/services/admin-payments.service';
import { PaymentReviewComponent } from './payment-review.component';

const ID = 'pay_1';
const detailUrl = (id: string) => (req: HttpRequest<unknown>) =>
  req.url.endsWith(`/bff/admin/payments/${id}`);
const isQueue = (req: HttpRequest<unknown>) => req.url.endsWith('/bff/admin/payments');

function proof(overrides: Partial<AdminProof> = {}): AdminProof {
  return {
    id: 'p1',
    kind: 'VOUCHER',
    method: 'Yape',
    declaredAmount: 350,
    verifiedAmount: null,
    uploadedBy: 'GUEST',
    addedAt: '2026-11-03T19:05:00Z',
    receivedOn: null,
    file: { name: 'voucher.png', contentType: 'image/png', sizeBytes: 1000 },
    fileUrl: 'https://r2.example.test/signed?sig=abc',
    ...overrides,
  };
}

function payment(overrides: Partial<PaymentDetail> = {}): PaymentDetail {
  return {
    id: ID,
    guestId: 'g1',
    guestName: 'Ana Quispe',
    documentNumber: '12345678',
    guestType: 'CONTRACT',
    environmentCode: 'C1',
    contractId: 'c1',
    stayId: null,
    period: '2026-09',
    stayStartDate: null,
    stayEndDate: null,
    expectedAmount: 350,
    creditApplied: 0,
    amountDue: 350,
    lastPeriod: false,
    amount: 350,
    verifiedAmount: null,
    status: 'PENDING',
    rejectionReason: null,
    surplus: null,
    reviewedAt: null,
    reviewedBy: null,
    submittedAt: '2026-11-03T19:05:00Z',
    createdAt: '2026-11-03T19:05:00Z',
    proofs: [proof()],
    reviews: [],
    ...overrides,
  } as PaymentDetail;
}

async function settle(harness: RouterTestingHarness) {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await harness.fixture.whenStable();
}

async function setup(detail: PaymentDetail = payment(), query = '') {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'admin/payments', children: [] },
        { path: 'admin/payments/:id', component: PaymentReviewComponent },
      ]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
    ],
  });
  const harness = await RouterTestingHarness.create();
  const http = TestBed.inject(HttpTestingController);
  await harness.navigateByUrl(`/admin/payments/${ID}${query}`);
  const expect1 = async (match: (req: HttpRequest<unknown>) => boolean) =>
    vi.waitFor(() => http.expectOne(match));
  const flush = async (req: TestRequest, body: object | null, status = 200) => {
    req.flush(body, { status, statusText: 'x' });
    await settle(harness);
  };
  await flush(await expect1(detailUrl(ID)), detail);
  const page = () => within(present(harness.routeNativeElement));
  const click = async (element: HTMLElement) => {
    fireEvent.click(element);
    await settle(harness);
  };
  const dialog = () =>
    within(present(document.body.querySelector<HTMLElement>('mat-dialog-container')));
  return { harness, http, page, click, dialog, expect1, flush };
}

describe('PaymentReviewComponent (A5.2)', () => {
  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
    TestBed.inject(HttpTestingController).verify();
  });

  it('shows what is paid and each proof, with its signed link opened safely', async () => {
    const { page } = await setup(
      payment({
        proofs: [
          proof(),
          proof({
            id: 'p2',
            kind: 'CASH',
            method: null,
            uploadedBy: 'ADMIN',
            declaredAmount: 20,
            file: null,
            fileUrl: null,
          }),
        ],
      }),
    );

    const region = page().getByRole('region', { name: 'Lo que se paga' });
    const facts = [...region.querySelectorAll('dl > div')].map((pair) => [
      pair.querySelector('dt')?.textContent.trim(),
      pair.querySelector('dd')?.textContent.trim(),
    ]);
    expect(facts).toEqual([
      ['Huésped', 'Ana Quispe'],
      ['Documento', '12345678'],
      ['Ambiente', 'C1'],
      ['Período', 'Septiembre 2026'],
      ['Cuota del mes', 'S/ 350.00'],
      ['Por cobrar', 'S/ 350.00'],
      ['Subido', '3 nov 2026, 14:05'],
    ]);
    const links = page().getAllByRole('link', { name: /Descargar voucher/ });
    expect(links).toHaveLength(1);
    expect(links[0]?.getAttribute('href')).toBe('https://r2.example.test/signed?sig=abc');
    expect(links[0]?.getAttribute('target')).toBe('_blank');
    expect(links[0]?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(page().getByText(/Agregado por la administración/)).toBeTruthy();
    expect(page().getByText(/Subido por el huésped/)).toBeTruthy();
  });

  it('approves with the verified amount of every proof and then offers the next one', async () => {
    const { page, click, expect1, flush, harness } = await setup(
      payment({
        amountDue: 350,
        proofs: [proof({ declaredAmount: 300 }), proof({ id: 'p2', declaredAmount: 60 })],
      }),
    );
    fireEvent.input(page().getByLabelText(/Monto verificado del comprobante 2/), {
      target: { value: '50' },
    });
    await settle(harness);
    expect(page().getByRole('status').textContent).toContain('Completo');

    await click(page().getByRole('button', { name: 'Aprobar' }));
    const patch = await expect1(detailUrl(ID));
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({
      status: 'APPROVED',
      proofs: [
        { id: 'p1', verifiedAmount: 300 },
        { id: 'p2', verifiedAmount: 50 },
      ],
    });
    await flush(patch, {});
    await flush(await expect1(detailUrl(ID)), payment({ status: 'APPROVED' }));

    expect(page().getByRole('heading', { name: 'Pago aprobado' })).toBeTruthy();
    expect(page().queryByRole('button', { name: 'Aprobar' })).toBeNull();

    await click(page().getByRole('button', { name: 'Revisar el siguiente' }));
    const next = await expect1(isQueue);
    expect(next.request.params.get('status')).toBe('PENDING');
    expect(next.request.params.get('limit')).toBe('1');
    await flush(next, { content: [{ id: 'pay_2' }], nextCursor: null });
    await flush(await expect1(detailUrl('pay_2')), payment({ id: 'pay_2' }));

    expect(TestBed.inject(Router).url).toBe('/admin/payments/pay_2');
    expect(page().queryByRole('heading', { name: 'Pago aprobado' })).toBeNull();
    expect(page().getByRole('button', { name: 'Aprobar' })).toBeTruthy();
  });

  it('says none is left when no payment waits after resolving', async () => {
    const { page, click, expect1, flush } = await setup();
    await click(page().getByRole('button', { name: 'Aprobar' }));
    await flush(await expect1(detailUrl(ID)), {});
    await flush(await expect1(detailUrl(ID)), payment({ status: 'APPROVED' }));

    await click(page().getByRole('button', { name: 'Revisar el siguiente' }));
    await flush(await expect1(isQueue), { content: [], nextCursor: null });

    expect(page().getByText('No quedan pagos por revisar.')).toBeTruthy();
    expect(page().queryByRole('button', { name: 'Revisar el siguiente' })).toBeNull();
  });

  it('cannot approve while the verified sum is short, nor with an amount it cannot read', async () => {
    const { page, harness, http } = await setup(payment({ amountDue: 400 }));

    const approve = page().getByRole<HTMLButtonElement>('button', { name: 'Aprobar' });
    expect(approve.disabled).toBe(true);
    expect(page().getByRole('status').textContent).toContain('Faltan S/ 50.00');

    fireEvent.input(page().getByLabelText(/Monto verificado del comprobante 1/), {
      target: { value: 'abc' },
    });
    await settle(harness);
    expect(page().getByText('Revisa el monto')).toBeTruthy();
    fireEvent.click(approve);
    await settle(harness);
    http.expectNone((req) => req.method === 'PATCH');
  });

  it('requires a reason to reject, without calling the BFF', async () => {
    const { page, click, dialog, http } = await setup();

    await click(page().getByRole('button', { name: 'Rechazar' }));
    await click(dialog().getByRole('button', { name: 'Rechazar pago' }));

    expect(dialog().getByText('El motivo de rechazo es obligatorio')).toBeTruthy();
    http.expectNone((req) => req.method === 'PATCH');

    fireEvent.input(dialog().getByLabelText('Motivo'), { target: { value: '   ' } });
    await click(dialog().getByRole('button', { name: 'Rechazar pago' }));
    expect(dialog().getByText('El motivo de rechazo es obligatorio')).toBeTruthy();
    http.expectNone((req) => req.method === 'PATCH');
  });

  it('fills the reason with a shortcut, lets it be edited and sends it', async () => {
    const { page, click, dialog, expect1, flush, harness } = await setup();

    await click(page().getByRole('button', { name: 'Rechazar' }));
    await click(dialog().getByRole('button', { name: 'No se lee el voucher' }));
    const reason = dialog().getByLabelText<HTMLTextAreaElement>('Motivo');
    expect(reason.value).toBe('No se lee el voucher');
    fireEvent.input(reason, { target: { value: 'No se lee el voucher, está borroso ' } });
    await settle(harness);
    await click(dialog().getByRole('button', { name: 'Rechazar pago' }));

    const patch = await expect1(detailUrl(ID));
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({
      status: 'REJECTED',
      reason: 'No se lee el voucher, está borroso',
    });
    await flush(patch, {});
    await flush(await expect1(detailUrl(ID)), payment({ status: 'REJECTED' }));
    expect(page().getByRole('heading', { name: 'Pago rechazado' })).toBeTruthy();
  });

  it('shows a rejected payment with the red notice and "Rechazar de nuevo"', async () => {
    const { page } = await setup(
      payment({
        status: 'REJECTED',
        rejectionReason: 'El monto no coincide',
        reviewedBy: { id: 'u1', name: 'Rosa' },
        reviewedAt: '2026-11-02T15:00:00Z',
        amountDue: 400,
      }),
    );

    const notice = present(page().getByText(/Motivo: El monto no coincide/).parentElement);
    expect(notice.classList).toContain('quipu-alert');
    expect(notice.textContent.replace(/\s+/g, ' ')).toContain(
      'Rechazado por Rosa el 2 nov 2026, 10:00',
    );
    expect(notice.textContent).toContain('Faltan S/ 50.00 para cubrir lo que corresponde.');
    expect(page().getByRole('button', { name: 'Rechazar de nuevo' })).toBeTruthy();
    expect(page().getByLabelText(/Monto verificado del comprobante 1/)).toBeTruthy();
  });

  it('shows an approved payment read-only', async () => {
    const { page } = await setup(
      payment({
        status: 'APPROVED',
        reviewedBy: { id: 'u1', name: 'Rosa' },
        proofs: [proof({ verifiedAmount: 350 })],
      }),
    );

    expect(page().getByText(/Aprobado\s+por Rosa/)).toBeTruthy();
    expect(page().getByText('Verificado: S/ 350.00')).toBeTruthy();
    expect(page().queryByRole('button', { name: 'Aprobar' })).toBeNull();
    expect(page().queryByRole('button', { name: 'Agregar comprobante' })).toBeNull();
    expect(page().queryByLabelText(/Monto verificado/)).toBeNull();
  });

  it('disables "Agregar comprobante" with 5 proofs and says why', async () => {
    const proofs = ['a', 'b', 'c', 'd', 'e'].map((id) => proof({ id, declaredAmount: 70 }));
    const { page, click } = await setup(payment({ proofs }));

    const add = page().getByRole<HTMLButtonElement>('button', { name: 'Agregar comprobante' });
    expect(add.disabled).toBe(true);
    expect(page().getByText('Hasta 5 comprobantes por pago.').id).toBe(
      add.getAttribute('aria-describedby'),
    );
    await click(add);
    expect(document.body.querySelector('mat-dialog-container')).toBeNull();
  });

  it('adds a cash proof keeping the others, and reloads the payment', async () => {
    const { page, click, dialog, expect1, flush, harness } = await setup(
      payment({ amountDue: 400 }),
    );
    await click(page().getByRole('button', { name: 'Agregar comprobante' }));
    expect(dialog().getByText('Faltan S/ 50.00 para cubrir lo que corresponde.')).toBeTruthy();

    fireEvent.click(dialog().getByLabelText('Efectivo, sin voucher'));
    await settle(harness);
    await click(dialog().getByRole('button', { name: 'Agregar' }));
    expect(dialog().getByText('El monto debe ser mayor a 0')).toBeTruthy();
    fireEvent.input(dialog().getByLabelText('Monto verificado (S/)'), { target: { value: '50' } });
    await settle(harness);
    await click(dialog().getByRole('button', { name: 'Agregar' }));

    const put = await expect1((req) => req.url.endsWith(`/bff/admin/payments/${ID}/proofs`));
    expect(put.request.method).toBe('PUT');
    const body = put.request.body as FormData;
    expect(JSON.parse(await (body.get('proofs') as Blob).text())).toEqual([
      { id: 'p1', kind: 'VOUCHER', amount: 350, method: 'Yape' },
      { kind: 'CASH', amount: 50 },
    ]);
    expect(body.getAll('files')).toEqual([]);
    await flush(put, {});
    // Until the new proofs arrive, nothing can be sent from the old list.
    for (const name of ['Agregar comprobante', 'Aprobar', 'Rechazar']) {
      expect(page().getByRole<HTMLButtonElement>('button', { name }).disabled).toBe(true);
    }
    await flush(
      await expect1(detailUrl(ID)),
      payment({
        amountDue: 400,
        proofs: [
          proof(),
          proof({
            id: 'p2',
            kind: 'CASH',
            uploadedBy: 'ADMIN',
            declaredAmount: 50,
            file: null,
            fileUrl: null,
          }),
        ],
      }),
    );
    expect(page().getByRole('status').textContent).toContain('Completo');
  });

  it('refuses a voucher file that is not JPG, PNG or PDF before sending anything', async () => {
    const { page, click, dialog, harness, http } = await setup();
    await click(page().getByRole('button', { name: 'Agregar comprobante' }));

    const input = dialog().getByLabelText<HTMLInputElement>('Archivo del voucher');
    const exe = new File(['MZ'], 'virus.exe', { type: 'application/x-msdownload' });
    Object.defineProperty(input, 'files', { value: [exe], configurable: true });
    fireEvent.change(input);
    await settle(harness);

    expect(dialog().getByText('Archivo inválido — sube JPG, PNG o PDF de máx. 5MB')).toBeTruthy();
    fireEvent.input(dialog().getByLabelText('Monto verificado (S/)'), { target: { value: '10' } });
    await click(dialog().getByRole('button', { name: 'Agregar' }));
    http.expectNone((req) => req.method === 'PUT');
  });

  it('refuses a voucher over 5 MB', async () => {
    const { page, click, dialog, harness } = await setup();
    await click(page().getByRole('button', { name: 'Agregar comprobante' }));

    const input = dialog().getByLabelText<HTMLInputElement>('Archivo del voucher');
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.pdf', {
      type: 'application/pdf',
    });
    Object.defineProperty(input, 'files', { value: [big], configurable: true });
    fireEvent.change(input);
    await settle(harness);

    expect(dialog().getByText('Archivo inválido — sube JPG, PNG o PDF de máx. 5MB')).toBeTruthy();
  });

  it('opens the shared dialog on 409 CONCURRENT_MODIFICATION and reloads on "Volver a cargar"', async () => {
    const { page, click, dialog, expect1, flush, harness } = await setup();
    await click(page().getByRole('button', { name: 'Agregar comprobante' }));
    fireEvent.click(dialog().getByLabelText('Efectivo, sin voucher'));
    fireEvent.input(dialog().getByLabelText('Monto verificado (S/)'), { target: { value: '5' } });
    await settle(harness);
    await click(dialog().getByRole('button', { name: 'Agregar' }));

    const put = await expect1((req) => req.url.endsWith('/proofs'));
    await flush(put, { code: 'CONCURRENT_MODIFICATION', message: 'x' }, 409);

    const alert = await screen.findByRole('alertdialog', { name: 'El pago cambió' });
    expect(alert.textContent).toContain(
      'El registro cambió mientras lo editabas; vuelve a cargarlo e inténtalo de nuevo',
    );
    await click(within(alert).getByRole('button', { name: 'Volver a cargar' }));
    await flush(
      await expect1(detailUrl(ID)),
      payment({ proofs: [proof({ declaredAmount: 999 })] }),
    );

    expect(page().getByText('Declarado: S/ 999.00')).toBeTruthy();
  });

  it('shows the BFF message in a modal when the payment was already resolved', async () => {
    const { page, click, expect1, flush } = await setup();
    await click(page().getByRole('button', { name: 'Aprobar' }));
    await flush(
      await expect1(detailUrl(ID)),
      { code: 'PAYMENT_ALREADY_RESOLVED', message: 'Este pago ya fue resuelto por otro proceso' },
      409,
    );

    const alert = await screen.findByRole('alertdialog', { name: 'Este pago ya se resolvió' });
    expect(alert.textContent).toContain('Este pago ya fue resuelto por otro proceso');
    await click(within(alert).getByRole('button', { name: 'Volver a Pagos' }));

    await vi.waitFor(() => {
      expect(TestBed.inject(Router).url).toBe('/admin/payments');
    });
  });

  it('offers "Rechazar con motivo" when the month is no longer charged', async () => {
    const { page, click, dialog, expect1, flush } = await setup();
    await click(page().getByRole('button', { name: 'Aprobar' }));
    await flush(
      await expect1(detailUrl(ID)),
      { code: 'PAYMENT_PERIOD_NOT_PAYABLE', message: 'Este mes ya no se cobra.' },
      409,
    );

    const alert = await screen.findByRole('alertdialog', { name: 'Este mes ya no se cobra' });
    await click(within(alert).getByRole('button', { name: 'Rechazar con motivo' }));

    await vi.waitFor(() => {
      expect(dialog().getByLabelText('Motivo')).toBeTruthy();
    });
  });

  it('shows any other error of a decision under the page, with the BFF text', async () => {
    const { page, click, expect1, flush } = await setup();
    await click(page().getByRole('button', { name: 'Aprobar' }));
    await flush(
      await expect1(detailUrl(ID)),
      {
        code: 'VALIDATION_ERROR',
        message: 'Lo verificado no cubre lo que corresponde',
        field: 'proofs',
      },
      400,
    );

    expect(page().getByRole('alert').textContent).toContain(
      'Lo verificado no cubre lo que corresponde',
    );
    expect(page().getByRole('button', { name: 'Aprobar' })).toBeTruthy();
  });

  it('says the payment does not exist when the BFF answers 404', async () => {
    const { page } = await setupMissing();

    expect(page().getByText('No encontramos el pago.')).toBeTruthy();
    expect(
      page()
        .getAllByRole('link', { name: 'Volver a Pagos' })
        .every((link) => link.getAttribute('href') === '/admin/payments'),
    ).toBe(true);
  });

  it('returns to the view of A5 it was opened from', async () => {
    const { page } = await setup(payment(), '?vista=rechazados');

    const back = page().getAllByRole('link', { name: 'Volver a Pagos' });
    expect(back.map((link) => link.getAttribute('href'))).toEqual([
      '/admin/payments?vista=rechazados',
    ]);
  });

  it('does not carry a view it does not know back to A5', async () => {
    const { page } = await setup(payment(), '?vista=%3Cscript%3E');

    expect(page().getByRole('link', { name: 'Volver a Pagos' }).getAttribute('href')).toBe(
      '/admin/payments',
    );
  });

  it('locks the verified amounts while a decision is on its way and then shows the saved ones', async () => {
    const { page, click, expect1, flush, harness } = await setup(
      payment({ amountDue: 300, proofs: [proof({ declaredAmount: 350 })] }),
    );
    fireEvent.input(page().getByLabelText(/Monto verificado del comprobante 1/), {
      target: { value: '320' },
    });
    await settle(harness);

    await click(page().getByRole('button', { name: 'Aprobar' }));
    const patch = await expect1(detailUrl(ID));
    expect(
      page().getByLabelText<HTMLInputElement>(/Monto verificado del comprobante 1/).disabled,
    ).toBe(true);
    await flush(patch, {});
    await flush(
      await expect1(detailUrl(ID)),
      payment({
        status: 'APPROVED',
        amountDue: 300,
        proofs: [proof({ declaredAmount: 350, verifiedAmount: 310 })],
        surplus: { amount: 10, outcome: 'CREDIT' },
      }),
    );

    expect(page().getByText('Verificado: S/ 310.00')).toBeTruthy();
    const amounts = present(page().getByRole('region', { name: 'Montos' }).textContent).replace(
      /\s+/g,
      ' ',
    );
    expect(amounts).toMatch(/Verificado\s*S\/ 310\.00/);
    expect(amounts).toContain('Sobran S/ 10.00: quedó como crédito del mes siguiente.');
  });

  it('ignores the answer of a decision once another payment is open', async () => {
    const { page, click, expect1, flush, harness, http } = await setup();
    await click(page().getByRole('button', { name: 'Aprobar' }));
    const patch = await expect1((req) => req.method === 'PATCH');

    await harness.navigateByUrl('/admin/payments/pay_2');
    await flush(await expect1(detailUrl('pay_2')), payment({ id: 'pay_2' }));
    await flush(patch, {});

    expect(page().queryByRole('heading', { name: 'Pago aprobado' })).toBeNull();
    expect(page().getByRole<HTMLButtonElement>('button', { name: 'Aprobar' }).disabled).toBe(false);
    http.expectNone((req) => req.method === 'GET');
  });

  it('does not pull the administrator back into a payment after leaving', async () => {
    const { page, click, expect1, flush, harness } = await setup();
    await click(page().getByRole('button', { name: 'Aprobar' }));
    await flush(await expect1(detailUrl(ID)), {});
    await flush(await expect1(detailUrl(ID)), payment({ status: 'APPROVED' }));
    await click(page().getByRole('button', { name: 'Revisar el siguiente' }));
    const next = await expect1(isQueue);

    await harness.navigateByUrl('/admin/payments');
    await flush(next, { content: [{ id: 'pay_2' }], nextCursor: null });

    expect(TestBed.inject(Router).url).toBe('/admin/payments');
  });

  it('keeps the new payment locked while its write runs, whatever the previous refresh does', async () => {
    const { page, click, expect1, flush, harness } = await setup();
    await click(page().getByRole('button', { name: 'Aprobar' }));
    await flush(await expect1((req) => req.method === 'PATCH'), {});
    const oldRefresh = await expect1(detailUrl(ID));

    await harness.navigateByUrl('/admin/payments/pay_2');
    await flush(await expect1(detailUrl('pay_2')), payment({ id: 'pay_2' }));
    await click(page().getByRole('button', { name: 'Aprobar' }));
    const secondPatch = await expect1((req) => req.method === 'PATCH');
    await flush(oldRefresh, payment({ status: 'APPROVED' }));

    expect(page().getByRole<HTMLButtonElement>('button', { name: 'Aprobar' }).disabled).toBe(true);
    expect(
      page().getByRole<HTMLButtonElement>('button', { name: 'Agregar comprobante' }).disabled,
    ).toBe(true);
    await flush(secondPatch, {});
    await flush(await expect1(detailUrl('pay_2')), payment({ id: 'pay_2', status: 'APPROVED' }));
  });

  it.each([
    ['CREDIT', 'Sobran S/ 20.00: quedó como crédito del mes siguiente.'],
    ['REFUND_PENDING', 'Sobran S/ 20.00: devolución pendiente; regístrala en Finanzas.'],
    ['REFUNDED', 'Sobran S/ 20.00: ya se devolvió.'],
  ] as const)(
    'shows what the BFF recorded for the surplus of an approved payment (%s)',
    async (outcome, text) => {
      const { page } = await setup(
        payment({
          status: 'APPROVED',
          lastPeriod: true,
          surplus: { amount: 20, outcome },
          proofs: [proof({ declaredAmount: 370, verifiedAmount: 370 })],
        }),
      );

      expect(present(page().getByRole('status').textContent).trim()).toBe(text);
    },
  );

  it('says an approved payment without surplus is complete', async () => {
    const { page } = await setup(
      payment({ status: 'APPROVED', surplus: null, proofs: [proof({ verifiedAmount: 350 })] }),
    );

    expect(present(page().getByRole('status').textContent).trim()).toBe('Completo');
  });
});

async function setupMissing() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'admin/payments', children: [] },
        { path: 'admin/payments/:id', component: PaymentReviewComponent },
      ]),
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/admin/payments/missing');
  const req = await vi.waitFor(() =>
    TestBed.inject(HttpTestingController).expectOne(detailUrl('missing')),
  );
  req.flush(
    { code: 'PAYMENT_NOT_FOUND', message: 'El pago no existe' },
    { status: 404, statusText: 'x' },
  );
  await settle(harness);
  return { page: () => within(present(harness.routeNativeElement)) };
}

/** Fails the test with a clear message instead of a non-null assertion. */
function present<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error('expected the element to be on the page');
  }
  return value;
}
