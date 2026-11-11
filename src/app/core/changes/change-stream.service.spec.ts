import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import type { Session } from '@core/auth/auth.service';
import { BFF_BASE_URL } from '@core/config/bff-base-url';
import { ChangeResourcesService } from './change-resources.service';
import {
  CHANGE_EVENT_SOURCE_FACTORY,
  CHANGES_ENABLED,
  ChangeStreamService,
} from './change-stream.service';

const epoch = 'f18a40da-6ddf-4ab4-a75b-f4ad8de2d615';
const admin: Session = { role: 'ADMIN', name: 'Admin', mustChangePassword: false };
class Source extends EventTarget {
  onerror: EventSource['onerror'] = null;
  readonly close = vi.fn();
  send(type: string, value: unknown): void {
    this.dispatchEvent(new MessageEvent(type, { data: JSON.stringify(value) }));
  }
  fail(): void {
    this.onerror?.call(this as unknown as EventSource, new Event('error'));
  }
}
function setup(session: Session | null = admin) {
  const current = signal(session);
  const auth = {
    session: current,
    verifySession: vi.fn(() => of(current())),
    clear: vi.fn(() => {
      current.set(null);
    }),
  };
  const resources = { ready: vi.fn(), changed: vi.fn() };
  const router = { url: '/home', navigate: vi.fn().mockResolvedValue(true) };
  const sources: Source[] = [];
  const factory = vi.fn(() => {
    const source = new Source();
    sources.push(source);
    return source;
  });
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthService, useValue: auth },
      { provide: Router, useValue: router },
      { provide: ChangeResourcesService, useValue: resources },
      { provide: BFF_BASE_URL, useValue: '' },
      { provide: CHANGES_ENABLED, useValue: true },
      { provide: CHANGE_EVENT_SOURCE_FACTORY, useValue: factory },
    ],
  });
  const service = TestBed.inject(ChangeStreamService);
  return { service, auth, resources, router, sources, factory };
}
function visibility(value: DocumentVisibilityState): void {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(value);
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('SSE transport (QP-ANGWEB-SSE-01)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    visibility('visible');
  });
  afterEach(() => {
    TestBed.inject(ChangeStreamService).stop();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('opens one stream per area, resyncs every ready and rejects cross-role messages', () => {
    const { service, sources, factory, resources } = setup();
    service.start();
    service.start();
    expect(factory).toHaveBeenCalledExactlyOnceWith('/bff/admin/changes/stream', {
      withCredentials: true,
    });
    sources[0]?.send('ready', { epoch, version: 0 });
    sources[0]?.send('ready', { epoch, version: 0 });
    expect(resources.ready).toHaveBeenCalledTimes(2);
    sources[0]?.send('changed', { epoch, version: 1, invalidate: ['admin.dashboard'] });
    sources[0]?.send('changed', { epoch, version: 2, invalidate: ['guest.home'] });
    expect(resources.changed).toHaveBeenCalledExactlyOnceWith(['admin.dashboard']);
  });

  it('closes the native retry loop, checks the session and uses bounded increasing waits', async () => {
    const { service, sources, auth, factory } = setup();
    service.start();
    sources[0]?.fail();
    expect(sources[0]?.close).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(29_999);
    expect(factory).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(factory).toHaveBeenCalledTimes(2);
    sources[1]?.fail();
    await vi.advanceTimersByTimeAsync(59_999);
    expect(factory).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(factory).toHaveBeenCalledTimes(3);
    expect(auth.clear).not.toHaveBeenCalled();
  });

  it('recovers token expiry using the shared HttpClient session check, and stops on revocation', async () => {
    const { service, sources, auth, resources, router } = setup();
    service.start();
    sources[0]?.send('ready', { epoch, version: 0 });
    sources[0]?.send('closing', { reason: 'access-token-expired' });
    await vi.advanceTimersByTimeAsync(1000);
    expect(auth.verifySession).toHaveBeenCalledOnce();
    sources[1]?.send('ready', { epoch, version: 0 });
    expect(resources.ready).toHaveBeenCalledTimes(2);
    sources[1]?.send('closing', { reason: 'session-revoked' });
    expect(auth.clear).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { expired: '1', returnUrl: '/home' },
    });
  });

  it.each([0, 429, 503])('preserves the session on transient check failure %s', async (status) => {
    const { service, sources, auth, factory } = setup();
    auth.verifySession.mockReturnValue(throwError(() => new HttpErrorResponse({ status })));
    service.start();
    sources[0]?.fail();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(auth.clear).not.toHaveBeenCalled();
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('ignores a late session check after logout, including a definitive 401', async () => {
    const { service, sources, auth, router, factory } = setup();
    const check = new Subject<Session | null>();
    auth.verifySession.mockReturnValue(check);
    service.start();
    sources[0]?.fail();
    service.stop();
    check.error(new HttpErrorResponse({ status: 401 }));
    await vi.advanceTimersByTimeAsync(120_000);
    expect(auth.clear).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('pauses while hidden, including initial start, and resyncs when visible', () => {
    const { service, sources, factory, resources } = setup();
    visibility('hidden');
    service.start();
    expect(factory).not.toHaveBeenCalled();
    visibility('visible');
    expect(factory).toHaveBeenCalledTimes(1);
    sources[0]?.send('ready', { epoch, version: 0 });
    visibility('hidden');
    expect(sources[0]?.close).toHaveBeenCalledOnce();
    visibility('visible');
    expect(factory).toHaveBeenCalledTimes(2);
    expect(resources.ready).toHaveBeenCalled();
  });

  it('stops automatic retry after five openings without ready and permits explicit retry', async () => {
    const { service, sources, factory } = setup();
    service.start();
    for (let attempt = 0; attempt < 5; attempt++) {
      sources[attempt]?.fail();
      await vi.advanceTimersByTimeAsync(120_000);
    }
    expect(factory).toHaveBeenCalledTimes(5);
    expect(service.retryRequired()).toBe(true);
    service.retry();
    expect(factory).toHaveBeenCalledTimes(6);
  });

  it('uses the guest stream for temporary guests and excludes onboarding', () => {
    const { service, auth, factory } = setup({
      role: 'GUEST',
      name: 'Guest',
      mustChangePassword: false,
      guestType: 'TEMPORARY',
      guestStatus: 'ACTIVE',
    });
    service.start();
    expect(factory).toHaveBeenCalledWith('/bff/guest/changes/stream', { withCredentials: true });
    service.stop();
    auth.session.set({
      role: 'GUEST',
      name: 'Guest',
      mustChangePassword: false,
      guestStatus: 'ONBOARDING',
      nextOnboardingStep: 'PERSONAL_DATA',
    });
    service.start();
    expect(factory).toHaveBeenCalledTimes(1);
  });
});
