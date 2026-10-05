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
import { AuthService } from '@core/services/auth.service';
import { environment } from '../../../environments/environment';
import { anonymousGuard } from './anonymous.guard';
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

  describe('anonymousGuard', () => {
    it('lets an anonymous user see the login', () => {
      expect(run(anonymousGuard)).toBe(true);
    });

    it('sends a user who is already signed in to /home', async () => {
      await signIn();

      expect(run(anonymousGuard)).toEqual(TestBed.inject(Router).createUrlTree(['/home']));
    });
  });
});
