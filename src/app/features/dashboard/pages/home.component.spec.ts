import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { within } from '@testing-library/dom';
import { firstValueFrom } from 'rxjs';
import { AuthService, Role } from '@core/auth/auth.service';
import { HomeComponent } from './home.component';

const isLogin = (req: HttpRequest<unknown>) => req.url.endsWith('/bff/auth/login');

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
  const auth = TestBed.inject(AuthService);
  const login = firstValueFrom(
    auth.login({ documentType: 'DNI', documentNumber: '12345678', password: 'secret-1' }),
  );
  TestBed.inject(HttpTestingController).expectOne(isLogin).flush(session);
  await login;
  const fixture = TestBed.createComponent(HomeComponent);
  await fixture.whenStable();
  return { auth, fixture, ui: within(fixture.nativeElement as HTMLElement) };
}

describe('HomeComponent', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('greets the logged user by name and shows the role in Spanish', async () => {
    const { ui } = await setup({
      role: 'ADMIN',
      name: 'admin@example.test',
      mustChangePassword: false,
    });

    expect(ui.getByText('admin@example.test')).toBeTruthy();
    expect(ui.getByText('Administrador')).toBeTruthy();
  });

  it('shows the Spanish label for a guest', async () => {
    const { ui } = await setup({ role: 'GUEST', name: 'guest', mustChangePassword: false });

    expect(ui.getByText('Huésped')).toBeTruthy();
  });

  it('offers the administrator the way to Pagos (A5)', async () => {
    const { ui } = await setup({ role: 'ADMIN', name: 'admin', mustChangePassword: false });

    expect(ui.getByRole('link', { name: /Pagos/ }).getAttribute('href')).toBe('/admin/payments');
  });

  it('does not offer Pagos to a guest', async () => {
    const { ui } = await setup({ role: 'GUEST', name: 'guest', mustChangePassword: false });

    expect(ui.queryByRole('link', { name: /Pagos/ })).toBeNull();
  });

  it('leaves the place of the guest panels to the router (they come from my-account)', async () => {
    const { fixture } = await setup({
      role: 'GUEST',
      guestType: 'CONTRACT',
      name: 'guest',
      mustChangePassword: false,
    });

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('router-outlet')).not.toBeNull();
  });

  it('gives the administrator its shortcuts instead of the outlet of the guest panels', async () => {
    const { fixture } = await setup({ role: 'ADMIN', name: 'admin', mustChangePassword: false });

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('router-outlet')).toBeNull();
  });
});
