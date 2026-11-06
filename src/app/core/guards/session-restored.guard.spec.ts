import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { environment } from '../../../environments/environment';
import { sessionRestoredGuard } from './session-restored.guard';

const ME_URL = `${environment.bffBaseUrl}/bff/auth/me`;

const run = () =>
  TestBed.runInInjectionContext(() =>
    sessionRestoredGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
  );

describe('sessionRestoredGuard (A0.7)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('lets someone without a session through once the BFF has answered', async () => {
    const result = run();
    TestBed.inject(HttpTestingController)
      .expectOne(ME_URL)
      .flush({ code: 'AUTH_NO_SESSION', message: 'x' }, { status: 401, statusText: 'x' });

    expect(await result).toBe(true);
    expect(TestBed.inject(AuthService).session()).toBeNull();
  });

  it('restores the session before letting it through, so the page knows the role', async () => {
    const result = run();
    TestBed.inject(HttpTestingController)
      .expectOne(ME_URL)
      .flush({ role: 'ADMIN', name: 'a', mustChangePassword: false });

    expect(await result).toBe(true);
    expect(TestBed.inject(AuthService).session()?.role).toBe('ADMIN');
  });

  it('sends a session that must change its password to /change-password (RF-12)', async () => {
    const result = run();
    TestBed.inject(HttpTestingController)
      .expectOne(ME_URL)
      .flush({ role: 'GUEST', name: 'g', mustChangePassword: true });

    expect(await result).toEqual(TestBed.inject(Router).createUrlTree(['/change-password']));
  });
});
