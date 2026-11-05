import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  provideRouter,
  RedirectCommand,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { environment } from '../../../environments/environment';
import { contractGuestGuard, temporaryGuestGuard } from './guest.guard';

const ME_URL = `${environment.bffBaseUrl}/bff/auth/me`;

const ASKED = '/guest/payments/new';

const run = (guard: CanActivateFn) =>
  TestBed.runInInjectionContext(() =>
    guard({} as ActivatedRouteSnapshot, { url: ASKED } as RouterStateSnapshot),
  );

const CONTRACT = { role: 'GUEST', guestType: 'CONTRACT', name: 'g', mustChangePassword: false };
const TEMPORARY = { role: 'GUEST', guestType: 'TEMPORARY', name: 't', mustChangePassword: false };
const ADMIN = { role: 'ADMIN', name: 'a', mustChangePassword: false };
const UNTYPED = { role: 'GUEST', name: 'u', mustChangePassword: false };

describe('guest guards', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  const answerMe = (body: object) => {
    TestBed.inject(HttpTestingController).expectOne(ME_URL).flush(body);
  };
  // A0.7: «Sin acceso» under the address that was asked for.
  const noAccess = () =>
    new RedirectCommand(TestBed.inject(Router).parseUrl('/no-access'), { browserUrl: ASKED });

  describe('contractGuestGuard (H3, H4)', () => {
    it('lets a guest with a contract through', async () => {
      const result = run(contractGuestGuard);
      answerMe(CONTRACT);

      expect(await result).toBe(true);
    });

    it.each([
      ['a temporary guest', TEMPORARY],
      ['the administrator', ADMIN],
      ['a guest whose type is unknown', UNTYPED],
    ])('shows «Sin acceso» to %s and keeps the address', async (_, body) => {
      const result = run(contractGuestGuard);
      answerMe(body);

      expect(await result).toEqual(noAccess());
    });
  });

  describe('temporaryGuestGuard (T2)', () => {
    it('lets a temporary guest through', async () => {
      const result = run(temporaryGuestGuard);
      answerMe(TEMPORARY);

      expect(await result).toBe(true);
    });

    it.each([
      ['a guest with a contract', CONTRACT],
      ['the administrator', ADMIN],
      ['a guest whose type is unknown', UNTYPED],
    ])('shows «Sin acceso» to %s and keeps the address', async (_, body) => {
      const result = run(temporaryGuestGuard);
      answerMe(body);

      expect(await result).toEqual(noAccess());
    });
  });

  it('sends someone without a session to the login', async () => {
    const result = run(temporaryGuestGuard);
    TestBed.inject(HttpTestingController)
      .expectOne(ME_URL)
      .flush({ code: 'AUTH_NO_SESSION', message: 'x' }, { status: 401, statusText: 'x' });

    expect(await result).toEqual(TestBed.inject(Router).createUrlTree(['/login']));
  });
});
