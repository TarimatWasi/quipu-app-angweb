import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  RedirectCommand,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { environment } from '../../../environments/environment';
import { adminGuard } from './admin.guard';

const ME_URL = `${environment.bffBaseUrl}/bff/auth/me`;

const ASKED = '/admin/payments/pay_1';

const run = () =>
  TestBed.runInInjectionContext(() =>
    adminGuard({} as ActivatedRouteSnapshot, { url: ASKED } as RouterStateSnapshot),
  );

describe('adminGuard', () => {
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

  it('lets the administrator through', async () => {
    const result = run();
    answerMe({ role: 'ADMIN', name: 'a', mustChangePassword: false });

    expect(await result).toBe(true);
  });

  // A0.7: «Sin acceso» under the address that was asked for.
  const noAccess = () =>
    new RedirectCommand(TestBed.inject(Router).parseUrl('/no-access'), { browserUrl: ASKED });

  it('shows «Sin acceso» to a guest with a contract and keeps the address', async () => {
    const result = run();
    answerMe({ role: 'GUEST', guestType: 'CONTRACT', name: 'g', mustChangePassword: false });

    expect(await result).toEqual(noAccess());
  });

  it('shows «Sin acceso» to a temporary guest and keeps the address', async () => {
    const result = run();
    answerMe({ role: 'GUEST', guestType: 'TEMPORARY', name: 't', mustChangePassword: false });

    expect(await result).toEqual(noAccess());
  });

  it('sends someone without a session to the login', async () => {
    const result = run();
    TestBed.inject(HttpTestingController)
      .expectOne(ME_URL)
      .flush({ code: 'AUTH_NO_SESSION', message: 'x' }, { status: 401, statusText: 'x' });

    expect(await result).toEqual(TestBed.inject(Router).createUrlTree(['/login']));
  });
});
