import type { components } from '@core/api/bff.generated';
import { GUEST_IDS } from '../data/demo-users';
import { STAY_IDS } from '../data/seed-payments';
import {
  catalogOf,
  proofsForm,
  resetMockSettings,
  setUpMockBff,
  SOME_TEXT,
  voucherFile,
} from '../mock-bff.testing';
import type { MockHarness } from '../mock-bff.testing';

type Schemas = components['schemas'];
type QueuePage = Schemas['PagedPaymentQueue'];
type Payment = Schemas['Payment'];
interface QueueDashboard {
  readonly pendingVouchers: Schemas['PaymentQueueItem'][];
  readonly pendingVouchersTotal: number;
  readonly rejected: Schemas['DashboardRejected'];
}

const ids = (page: QueuePage) => page.content.map((item) => item.id);

async function admin(): Promise<MockHarness> {
  const mock = setUpMockBff();
  await mock.signIn('admin');
  return mock;
}

describe('admin payments in the simulated BFF', () => {
  afterEach(() => {
    resetMockSettings();
  });

  it('counts the queue for A5 in the dashboard: the pending ones oldest first and the rejected ones', async () => {
    const mock = await admin();
    const pending = await mock.get<QueuePage>('/bff/admin/payments', { status: 'PENDING' });
    const before = await mock.get<QueueDashboard>('/bff/admin/dashboard');
    expect(before.pendingVouchersTotal).toBe(pending.content.length);
    expect(before.pendingVouchers.map((item) => item.id)).toEqual(ids(pending));

    const id = pending.content[0]?.id ?? '';
    await mock.send('PATCH', `/bff/admin/payments/${id}`, { status: 'REJECTED', reason: 'Falta' });
    const after = await mock.get<QueueDashboard>('/bff/admin/dashboard');
    expect(after.pendingVouchersTotal).toBe(pending.content.length - 1);
    expect(after.rejected.count).toBe(before.rejected.count + 1);
    expect(after.rejected.oldest).not.toBeNull();
  });

  it('approving a payment moves it from the pending view to the approved one', async () => {
    const mock = await admin();
    const pending = await mock.get<QueuePage>('/bff/admin/payments', { status: 'PENDING' });
    const id = pending.content[0]?.id ?? '';
    expect(pending.content.every((item) => item.status === 'PENDING')).toBe(true);
    const detail = await mock.get<Payment>(`/bff/admin/payments/${id}`);
    expect(detail.status).toBe('PENDING');
    const proofs = detail.proofs.map((proof) => ({
      id: proof.id,
      verifiedAmount: proof.declaredAmount,
    }));

    const summary = await mock.send<Schemas['PaymentSummary']>(
      'PATCH',
      `/bff/admin/payments/${id}`,
      {
        status: 'APPROVED',
        proofs,
      },
    );

    expect(summary.status).toBe('APPROVED');
    expect(
      ids(await mock.get<QueuePage>('/bff/admin/payments', { status: 'PENDING' })),
    ).not.toContain(id);
    expect(ids(await mock.get<QueuePage>('/bff/admin/payments', { status: 'APPROVED' }))).toContain(
      id,
    );
    const approved = await mock.get<Payment>(`/bff/admin/payments/${id}`);
    expect(approved.verifiedAmount).toBe(detail.amount);
    expect(approved.reviewedBy?.name).toBe('Rosa Elvira Quispe Mamani');
    const again = await mock.fail(
      mock.send('PATCH', `/bff/admin/payments/${id}`, { status: 'APPROVED', proofs }),
    );
    expect(again.status).toBe(409);
    expect(catalogOf(again)).toEqual({ code: 'PAYMENT_ALREADY_RESOLVED', message: SOME_TEXT });
  });

  it('turns what is left over into credit for the guest (RN-38)', async () => {
    const mock = await admin();
    const pending = await mock.get<QueuePage>('/bff/admin/payments', { status: 'PENDING' });
    const contractItem = pending.content.find((item) => item.guestType === 'CONTRACT');
    const detail = await mock.get<Payment>(`/bff/admin/payments/${contractItem?.id ?? ''}`);
    const proofs = detail.proofs.map((proof, index) => ({
      id: proof.id,
      verifiedAmount: proof.declaredAmount + (index === 0 ? 30 : 0),
    }));
    await mock.send('PATCH', `/bff/admin/payments/${detail.id}`, { status: 'APPROVED', proofs });
    const after = await mock.get<Payment>(`/bff/admin/payments/${detail.id}`);
    expect(after.surplus).toEqual({ amount: 30, outcome: 'CREDIT' });
    expect(mock.bff.db.credit(detail.guestId).balance).toBe(30);
  });

  it('refuses an approval that does not verify every proof or does not cover what is due', async () => {
    const mock = await admin();
    const pending = await mock.get<QueuePage>('/bff/admin/payments', { status: 'PENDING' });
    const detail = await mock.get<Payment>(`/bff/admin/payments/${pending.content[0]?.id ?? ''}`);
    const short = detail.proofs.map((proof) => ({ id: proof.id, verifiedAmount: 1 }));
    const error = await mock.fail(
      mock.send('PATCH', `/bff/admin/payments/${detail.id}`, { status: 'APPROVED', proofs: short }),
    );
    expect(catalogOf(error)).toEqual({
      code: 'VALIDATION_ERROR',
      message: SOME_TEXT,
      field: 'proofs',
    });
    const missing = await mock.fail(
      mock.send('PATCH', `/bff/admin/payments/${detail.id}`, { status: 'APPROVED', proofs: [] }),
    );
    expect(missing.status).toBe(400);
    expect((await mock.get<Payment>(`/bff/admin/payments/${detail.id}`)).status).toBe('PENDING');
  });

  it('rejects with a reason, and requires one', async () => {
    const mock = await admin();
    const pending = await mock.get<QueuePage>('/bff/admin/payments', { status: 'PENDING' });
    const id = pending.content[0]?.id ?? '';
    const blank = await mock.fail(
      mock.send('PATCH', `/bff/admin/payments/${id}`, { status: 'REJECTED', reason: '  ' }),
    );
    expect(catalogOf(blank)).toEqual({
      code: 'PAYMENT_REASON_REQUIRED',
      message: SOME_TEXT,
      field: 'reason',
    });
    await mock.send('PATCH', `/bff/admin/payments/${id}`, {
      status: 'REJECTED',
      reason: 'Monto incompleto',
    });
    const rejected = await mock.get<Payment>(`/bff/admin/payments/${id}`);
    expect(rejected.status).toBe('REJECTED');
    expect(rejected.rejectionReason).toBe('Monto incompleto');
    expect(ids(await mock.get<QueuePage>('/bff/admin/payments', { status: 'REJECTED' }))).toContain(
      id,
    );
  });

  it('walks the queue with the opaque cursor and refuses a forged one', async () => {
    const mock = await admin();
    const all = ids(
      await mock.get<QueuePage>('/bff/admin/payments', { status: 'APPROVED', limit: 100 }),
    );
    const walked: string[] = [];
    let page = await mock.get<QueuePage>('/bff/admin/payments', { status: 'APPROVED', limit: 3 });
    walked.push(...ids(page));
    while (page.nextCursor !== null) {
      page = await mock.get<QueuePage>('/bff/admin/payments', {
        status: 'APPROVED',
        limit: 3,
        after: page.nextCursor,
      });
      walked.push(...ids(page));
    }
    expect(all.length).toBeGreaterThan(3);
    expect(walked).toEqual(all);
    const forged = await mock.fail(mock.get('/bff/admin/payments', { after: 'no-es-un-cursor' }));
    expect(catalogOf(forged)).toEqual({
      code: 'VALIDATION_ERROR',
      message: SOME_TEXT,
      field: 'after',
    });
    expect((await mock.fail(mock.get('/bff/admin/payments', { limit: 101 }))).status).toBe(400);
  });

  it('answers 404 for an unknown payment', async () => {
    const mock = await admin();
    const error = await mock.fail(mock.get('/bff/admin/payments/no-existe'));
    expect(error.status).toBe(404);
    expect(catalogOf(error)).toEqual({ code: 'RESOURCE_NOT_FOUND', message: SOME_TEXT });
  });

  it('corrects the proofs of a pending payment (multipart, only the file metadata)', async () => {
    const mock = await admin();
    const pending = await mock.get<QueuePage>('/bff/admin/payments', { status: 'PENDING' });
    const detail = await mock.get<Payment>(`/bff/admin/payments/${pending.content[0]?.id ?? ''}`);
    const kept = detail.proofs[0];
    const body = proofsForm(
      [
        { id: kept?.id, kind: kept?.kind, amount: 100 },
        { kind: 'VOUCHER', amount: 900, method: 'Yape', fileIndex: 0 },
      ],
      [voucherFile('nuevo.png', 'image/png')],
    );
    await mock.send('PUT', `/bff/admin/payments/${detail.id}/proofs`, body);
    const after = await mock.get<Payment>(`/bff/admin/payments/${detail.id}`);
    expect(after.proofs.map((proof) => proof.declaredAmount)).toEqual([100, 900]);
    expect(after.proofs[1]?.file).toEqual({
      name: 'nuevo.png',
      contentType: 'image/png',
      sizeBytes: 16,
    });
    expect(after.proofs[1]?.uploadedBy).toBe('ADMIN');
  });

  it('refuses a file that is not JPG, PNG or PDF, and a body that is not multipart', async () => {
    const mock = await admin();
    const pending = await mock.get<QueuePage>('/bff/admin/payments', { status: 'PENDING' });
    const id = pending.content[0]?.id ?? '';
    const body = proofsForm(
      [{ kind: 'VOUCHER', amount: 750, fileIndex: 0 }],
      [voucherFile('a.gif', 'image/gif')],
    );
    const error = await mock.fail(mock.send('PUT', `/bff/admin/payments/${id}/proofs`, body));
    expect(catalogOf(error)).toEqual({
      code: 'VOUCHER_INVALID_FILE',
      message: SOME_TEXT,
      field: 'files[0]',
    });
    const json = await mock.fail(
      mock.send('PUT', `/bff/admin/payments/${id}/proofs`, { proofs: [] }),
    );
    expect(json.status).toBe(415);
  });

  it('answers 409 CONCURRENT_MODIFICATION to a correction in «Conflicto 409»', async () => {
    const mock = setUpMockBff('conflict');
    await mock.signIn('admin');
    const pending = await mock.get<QueuePage>('/bff/admin/payments', { status: 'PENDING' });
    const body = proofsForm([{ kind: 'CASH', amount: 750 }]);
    const error = await mock.fail(
      mock.send('PUT', `/bff/admin/payments/${pending.content[0]?.id ?? ''}/proofs`, body),
    );
    expect(error.status).toBe(409);
    expect(error.error).toEqual({
      code: 'CONCURRENT_MODIFICATION',
      message: 'El registro cambió mientras lo editabas; vuelve a cargarlo e inténtalo de nuevo',
    });
  });

  it('registers a direct payment approved at once, and then the stay is no longer payable', async () => {
    const mock = await admin();
    const before = await mock.get<Schemas['PayablePeriod'][]>(
      `/bff/admin/guests/${GUEST_IDS.jorge}/payable-periods`,
    );
    expect(before.map((item) => item.stayId)).toEqual([STAY_IDS.jorgeOverdue, STAY_IDS.jorgeNext]);
    expect(before[0]?.status).toBe('OVERDUE');
    const body = proofsForm([{ kind: 'CASH', amount: 300 }], [], {
      guestId: GUEST_IDS.jorge,
      stayId: STAY_IDS.jorgeOverdue,
    });
    const summary = await mock.send<Schemas['PaymentSummary']>('POST', '/bff/admin/payments', body);
    expect(summary).toEqual(
      expect.objectContaining({ status: 'APPROVED', stayId: STAY_IDS.jorgeOverdue, amount: 300 }),
    );
    const after = await mock.get<Schemas['PayablePeriod'][]>(
      `/bff/admin/guests/${GUEST_IDS.jorge}/payable-periods`,
    );
    expect(after.map((item) => item.stayId)).toEqual([STAY_IDS.jorgeNext]);
    const twice = await mock.fail(mock.send('POST', '/bff/admin/payments', body));
    expect(catalogOf(twice)).toEqual({
      code: 'PAYMENT_ALREADY_EXISTS_FOR_PERIOD',
      message: SOME_TEXT,
    });
  });

  it('refuses a direct payment with both or neither target, or short of what is due', async () => {
    const mock = await admin();
    const both = proofsForm([{ kind: 'CASH', amount: 350 }], [], {
      guestId: GUEST_IDS.jorge,
      stayId: STAY_IDS.jorgeNext,
      period: '2026-01',
    });
    expect((await mock.fail(mock.send('POST', '/bff/admin/payments', both))).error).toEqual(
      expect.objectContaining({ field: 'period' }),
    );
    const short = proofsForm([{ kind: 'CASH', amount: 10 }], [], {
      guestId: GUEST_IDS.jorge,
      stayId: STAY_IDS.jorgeNext,
    });
    expect((await mock.fail(mock.send('POST', '/bff/admin/payments', short))).error).toEqual(
      expect.objectContaining({ field: 'proofs' }),
    );
    const unknown = proofsForm([{ kind: 'CASH', amount: 10 }], [], {
      guestId: 'nadie',
      period: '2026-01',
    });
    expect((await mock.fail(mock.send('POST', '/bff/admin/payments', unknown))).status).toBe(404);
  });
});
