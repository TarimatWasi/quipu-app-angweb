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
import { adminGuard } from './admin.guard';

const ME_URL = `${environment.bffBaseUrl}/bff/auth/me`;

const run = () =>
  TestBed.runInInjectionContext(() =>
    adminGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
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

  it('sends a guest with a contract to its own home', async () => {
    const result = run();
    answerMe({ role: 'GUEST', guestType: 'CONTRACT', name: 'g', mustChangePassword: false });

    expect(await result).toEqual(TestBed.inject(Router).createUrlTree(['/home']));
  });

  it('sends a temporary guest to its own home', async () => {
    const result = run();
    answerMe({ role: 'GUEST', guestType: 'TEMPORARY', name: 't', mustChangePassword: false });

    expect(await result).toEqual(TestBed.inject(Router).createUrlTree(['/home']));
  });

  it('sends someone without a session to the login', async () => {
    const result = run();
    TestBed.inject(HttpTestingController)
      .expectOne(ME_URL)
      .flush({ code: 'AUTH_NO_SESSION', message: 'x' }, { status: 401, statusText: 'x' });

    expect(await result).toEqual(TestBed.inject(Router).createUrlTree(['/login']));
  });
});
