import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/services/auth.service';
import { environment } from '../../../environments/environment';
import { anonymousGuard } from './anonymous.guard';
import { authGuard } from './auth.guard';

const run = (guard: typeof authGuard) =>
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
    it('redirects to /login when there is no session', () => {
      expect(run(authGuard)).toEqual(TestBed.inject(Router).createUrlTree(['/login']));
    });

    it('lets an authenticated user through', async () => {
      await signIn();

      expect(run(authGuard)).toBe(true);
    });

    it('redirects again after the client session is cleared', async () => {
      await signIn();
      TestBed.inject(AuthService).clear();

      expect(run(authGuard)).toEqual(TestBed.inject(Router).createUrlTree(['/login']));
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
