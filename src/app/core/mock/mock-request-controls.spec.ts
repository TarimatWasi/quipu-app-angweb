import { HttpParams } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { DEMO_USERS } from './data/demo-users';
import type { MockCall } from './mock-bff';
import { MockRequestControls } from './mock-request-controls';
import { resetMockSettings, setUpMockBff } from './mock-bff.testing';
import { writeMockSetting } from './mock-storage';

function call(path = '/bff/admin/payments', method = 'GET', after = false): MockCall {
  return {
    path,
    method,
    query: new HttpParams(after ? { fromObject: { after: 'cursor' } } : {}),
    body: null,
  };
}

describe('MockRequestControls', () => {
  beforeEach(() => {
    resetMockSettings();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    resetMockSettings();
  });

  it('holds each selected read independently and keeps other requests usable', async () => {
    const controls = TestBed.inject(MockRequestControls);
    controls.configure('summary', 'hold', 'server');
    controls.configure('payment-list', 'hold', 'server');
    const run = vi.fn(() => Promise.resolve({ status: 200, body: [] }));
    const list = vi.fn();
    const summary = vi.fn();
    controls.dispatch(call('/bff/admin/dashboard'), run, 400).subscribe(summary);
    controls.dispatch(call(), run, 400).subscribe(list);
    controls.dispatch(call('/bff/auth/me'), run, 400).subscribe();
    await vi.advanceTimersByTimeAsync(400);
    expect(run).toHaveBeenCalledTimes(1);
    expect(controls.pending()).toHaveLength(2);
    const pending = controls.pending().at(1);
    if (!pending) throw new Error('expected held list');
    controls.resolve(pending.id);
    controls.resolve(pending.id);
    await vi.advanceTimersByTimeAsync(400);
    expect(list).toHaveBeenCalledTimes(1);
    expect(summary).not.toHaveBeenCalled();
    expect(controls.pending()).toHaveLength(1);
    controls.reset();
  });

  it('consumes an error once, distinguishes pagination and never executes a failed operation', async () => {
    const controls = TestBed.inject(MockRequestControls);
    controls.configure('payment-more', 'fail-next', 'conflict');
    const run = vi.fn(() => Promise.resolve({ status: 200, body: [] }));
    const first = vi.fn();
    const more = vi.fn();
    controls.dispatch(call(), run, 0).subscribe(first);
    controls.dispatch(call('/bff/admin/payments', 'GET', true), run, 0).subscribe(more);
    controls.dispatch(call('/bff/admin/payments', 'GET', true), run, 0).subscribe();
    await vi.runAllTimersAsync();
    expect(first.mock.calls[0]?.[0]).toEqual({ status: 200, body: [] });
    expect(more.mock.calls[0]?.[0]).toMatchObject({
      status: 409,
      body: { code: 'CONCURRENT_MODIFICATION' },
    });
    expect(run).toHaveBeenCalledTimes(2);
    expect(controls.rules()['payment-more']?.mode).toBe('normal');
  });

  it('cleans up canceled requests and cancels delayed work when changing session', async () => {
    const controls = TestBed.inject(MockRequestControls);
    controls.configure('payment-list', 'hold', 'server');
    const run = vi.fn(() => Promise.resolve({ status: 200, body: [] }));
    const subscription = controls.dispatch(call(), run, 0).subscribe();
    const id = controls.pending()[0]?.id ?? 0;
    subscription.unsubscribe();
    controls.resolve(id);
    controls.configure('payment-list', 'slow', 'server');
    controls.dispatch(call(), run, 0).subscribe();
    controls.cancelAll();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(run).not.toHaveBeenCalled();
    expect(controls.pending()).toHaveLength(0);
  });

  it('delays a selected operation for 9 seconds', async () => {
    const controls = TestBed.inject(MockRequestControls);
    controls.configure('payment-detail', 'slow', 'server');
    const run = vi.fn(() => Promise.resolve({ status: 200, body: {} }));
    controls.dispatch(call('/bff/admin/payments/id'), run, 0).subscribe();
    await vi.advanceTimersByTimeAsync(8_999);
    expect(run).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(run).toHaveBeenCalledOnce();
  });

  it('validates stored settings and remains usable when storage is blocked', () => {
    writeMockSetting(
      'quipu-mock:requests',
      JSON.stringify({
        summary: { mode: 'hold', failure: 'server' },
        writes: { mode: 'unknown', failure: 'server' },
        reads: null,
      }),
    );
    const controls = TestBed.inject(MockRequestControls);
    expect(controls.rules()).toEqual({ summary: { mode: 'hold', failure: 'server' } });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    controls.configure('summary', 'normal', 'server');
    expect(controls.storageAvailable()).toBe(false);
    expect(controls.rules().summary?.mode).toBe('normal');
  });

  it.each(['null', 'invalid json', '[]'])('ignores malformed storage: %s', (raw) => {
    writeMockSetting('quipu-mock:requests', raw);
    expect(TestBed.inject(MockRequestControls).rules()).toEqual({});
  });

  it('fails a held payment edit without changing the database, then permits the real retry', async () => {
    const mock = setUpMockBff();
    mock.bff.signIn(DEMO_USERS.admin);
    const payment = mock.bff.db.data.payments.find((item) => item.status === 'PENDING');
    if (!payment) throw new Error('expected pending payment');
    const controls = TestBed.inject(MockRequestControls);
    controls.configure('payment-write', 'hold', 'server');
    const outcome = mock.fail(
      mock.send('PATCH', `/bff/admin/payments/${payment.id}`, {
        status: 'REJECTED',
        reason: 'No se lee',
      }),
    );
    expect(payment.status).toBe('PENDING');
    controls.resolve(controls.pending()[0]?.id ?? 0, 'server');
    await vi.runAllTimersAsync();
    expect((await outcome).status).toBe(500);
    expect(payment.status).toBe('PENDING');
    controls.configure('payment-write', 'normal', 'server');
    const retry = mock.send('PATCH', `/bff/admin/payments/${payment.id}`, {
      status: 'REJECTED',
      reason: 'No se lee',
    });
    await vi.runAllTimersAsync();
    await retry;
    expect(payment.status).toBe('REJECTED');
    mock.backend.verify();
  });
});
