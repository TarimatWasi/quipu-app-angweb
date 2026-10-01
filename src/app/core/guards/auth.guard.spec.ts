import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  const run = () =>
    TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('redirects to /login when there is no session', () => {
    expect(run()).toEqual(TestBed.inject(Router).createUrlTree(['/login']));
  });

  it('lets an authenticated user through', () => {
    TestBed.inject(AuthService)
      .login({ documentType: 'DNI', documentNumber: '12345678', password: 'secret-1' })
      .subscribe();
    TestBed.inject(HttpTestingController)
      .expectOne(`${environment.bffBaseUrl}/bff/auth/login`)
      .flush({ role: 'ADMIN', name: 'a', mustChangePassword: false });

    expect(run()).toBe(true);
  });

  it('redirects again after the client session is cleared', () => {
    const auth = TestBed.inject(AuthService);
    auth
      .login({ documentType: 'DNI', documentNumber: '12345678', password: 'secret-1' })
      .subscribe();
    TestBed.inject(HttpTestingController)
      .expectOne(`${environment.bffBaseUrl}/bff/auth/login`)
      .flush({ role: 'ADMIN', name: 'a', mustChangePassword: false });
    auth.clear();

    expect(run()).toEqual(TestBed.inject(Router).createUrlTree(['/login']));
  });
});
