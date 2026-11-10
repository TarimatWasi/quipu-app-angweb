import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { within } from '@testing-library/dom';
import { firstValueFrom } from 'rxjs';
import { AuthService, Role } from '@core/auth/auth.service';
import { dashboardOf } from '../model/dashboard.testing';
import { HomeComponent } from './home.component';

const isLogin = (req: HttpRequest<unknown>) => req.url.endsWith('/bff/auth/login');
const isDashboard = (req: HttpRequest<unknown>) => req.url.endsWith('/bff/admin/dashboard');

@Component({ selector: 'app-login-stub', template: '' })
class LoginStubComponent {}

async function setup(session: {
  role: Role;
  name: string;
  mustChangePassword: boolean;
  guestType?: 'CONTRACT' | 'TEMPORARY';
}) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'login', component: LoginStubComponent }]),
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });
  const http = TestBed.inject(HttpTestingController);
  const auth = TestBed.inject(AuthService);
  const login = firstValueFrom(
    auth.login({ documentType: 'DNI', documentNumber: '12345678', password: 'secret-1' }),
  );
  http.expectOne(isLogin).flush(session);
  await login;
  const fixture = TestBed.createComponent(HomeComponent);
  // A resource keeps the app unstable while it reads: tick instead of waiting for it.
  TestBed.tick();
  return { auth, fixture, http, ui: within(fixture.nativeElement as HTMLElement) };
}

describe('HomeComponent', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('leaves the whole page of a guest to the router: its title and day come from my-account', async () => {
    const { fixture } = await setup({
      role: 'GUEST',
      guestType: 'CONTRACT',
      name: 'guest',
      mustChangePassword: false,
    });

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('router-outlet')).not.toBeNull();
  });

  it('does not ask a guest for the summary of the administrator', async () => {
    const { fixture } = await setup({ role: 'GUEST', name: 'guest', mustChangePassword: false });

    expect((fixture.nativeElement as HTMLElement).querySelector('app-admin-home')).toBeNull();
  });

  it('gives the administrator A1 (its summary is asked) instead of the outlet of the guest panels', async () => {
    const { fixture, http } = await setup({
      role: 'ADMIN',
      name: 'admin',
      mustChangePassword: false,
    });

    http.expectOne(isDashboard).flush(dashboardOf());
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('app-admin-home')).not.toBeNull();
    expect(root.querySelector('router-outlet')).toBeNull();
  });
});
