import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  provideRouter,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { environment } from '../../../environments/environment';
import { anonymousGuard, SESSION_WAIT_MS } from './anonymous.guard';
import { authGuard } from './auth.guard';

const ME_URL = `${environment.bffBaseUrl}/bff/auth/me`;

const run = (guard: CanActivateFn) =>
  TestBed.runInInjectionContext(() =>
    guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
  );

async function signIn() {
  const login = firstValueFrom(
    TestBed.inject(AuthService).login({
      documentType: 'DNI',
      documentNumber: '12345678',
      password: 'secret-1',
    }),
  );
  TestBed.inject(HttpTestingController)
    .expectOne(`${environment.bffBaseUrl}/bff/auth/login`)
    .flush({ role: 'ADMIN', name: 'a', mustChangePassword: false });
  await login;
}

describe('route guards', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  describe('authGuard', () => {
    it('redirects to /login when the BFF has no session for the browser', async () => {
      const result = run(authGuard);
      TestBed.inject(HttpTestingController)
        .expectOne(ME_URL)
        .flush({ code: 'AUTH_NO_SESSION', message: 'x' }, { status: 401, statusText: 'x' });

      expect(await result).toEqual(TestBed.inject(Router).createUrlTree(['/login']));
    });

    it('restores the session after a reload and lets the user through (TAR-74)', async () => {
      const result = run(authGuard);
      TestBed.inject(HttpTestingController)
        .expectOne(ME_URL)
        .flush({ role: 'ADMIN', name: 'a', mustChangePassword: false });

      expect(await result).toBe(true);
    });

    it('sends a restored session that must change its password to /change-password', async () => {
      const result = run(authGuard);
      TestBed.inject(HttpTestingController)
        .expectOne(ME_URL)
        .flush({ role: 'GUEST', name: 'g', mustChangePassword: true });

      expect(await result).toEqual(TestBed.inject(Router).createUrlTree(['/change-password']));
    });

    it('lets an authenticated user through without asking the BFF', async () => {
      await signIn();

      expect(await run(authGuard)).toBe(true);
    });

    it('redirects again after the client session is cleared', async () => {
      await signIn();
      TestBed.inject(AuthService).clear();

      expect(await run(authGuard)).toEqual(TestBed.inject(Router).createUrlTree(['/login']));
    });
  });

  describe('anonymousGuard (TAR-318)', () => {
    const runAnonymous = (url = '/login') =>
      TestBed.runInInjectionContext(() =>
        anonymousGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
      );

    it('lets an anonymous user see the login once the BFF says there is no session', async () => {
      const result = runAnonymous();
      TestBed.inject(HttpTestingController)
        .expectOne(ME_URL)
        .flush({ code: 'AUTH_NO_SESSION', message: 'x' }, { status: 401, statusText: 'x' });

      expect(await result).toBe(true);
    });

    it('sends a user who is already signed in to /home without asking the BFF', async () => {
      await signIn();

      expect(await runAnonymous()).toEqual(TestBed.inject(Router).createUrlTree(['/home']));
    });

    it('sends to /home a session that a reload restores: /login typed in the address bar', async () => {
      const result = runAnonymous();
      TestBed.inject(HttpTestingController)
        .expectOne(ME_URL)
        .flush({ role: 'ADMIN', name: 'a', mustChangePassword: false });

      expect(await result).toEqual(TestBed.inject(Router).createUrlTree(['/home']));
    });

    describe('with a server that is slow to answer', () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });
      afterEach(() => {
        vi.useRealTimers();
      });

      it('opens the login after the wait and, if the session arrives later, goes to /home', async () => {
        const router = TestBed.inject(Router);
        const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
        vi.spyOn(router, 'url', 'get').mockReturnValue('/login');
        const result = runAnonymous('/login');
        const me = TestBed.inject(HttpTestingController).expectOne(ME_URL);

        await vi.advanceTimersByTimeAsync(SESSION_WAIT_MS);
        expect(await result).toBe(true);
        expect(navigate).not.toHaveBeenCalled();

        me.flush({ role: 'ADMIN', name: 'a', mustChangePassword: false });
        await vi.advanceTimersByTimeAsync(0);
        expect(navigate).toHaveBeenCalledWith(router.createUrlTree(['/home']));
      });

      it('does not take the person away if they already left the page', async () => {
        const router = TestBed.inject(Router);
        const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
        vi.spyOn(router, 'url', 'get').mockReturnValue('/forgot-password');
        const result = runAnonymous('/login');
        const me = TestBed.inject(HttpTestingController).expectOne(ME_URL);

        await vi.advanceTimersByTimeAsync(SESSION_WAIT_MS);
        await result;
        me.flush({ role: 'ADMIN', name: 'a', mustChangePassword: false });
        await vi.advanceTimersByTimeAsync(0);

        expect(navigate).not.toHaveBeenCalled();
      });
    });
  });
});
