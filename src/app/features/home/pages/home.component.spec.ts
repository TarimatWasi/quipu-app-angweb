import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { within } from '@testing-library/dom';
import { firstValueFrom } from 'rxjs';
import { AuthService, Role } from '@core/services/auth.service';
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

  it('shows a guest with a contract its payment entries (H1), from its own account status', async () => {
    const { fixture, ui } = await setup({
      role: 'GUEST',
      guestType: 'CONTRACT',
      name: 'guest',
      mustChangePassword: false,
    });
    TestBed.inject(HttpTestingController)
      .expectOne((req) => req.url.endsWith('/bff/guest/account-status'))
      .flush([]);
    TestBed.inject(HttpTestingController)
      .expectOne((req) => req.url.endsWith('/bff/guest/credit'))
      .flush({ balance: 0, toRefund: false, origins: [], lastRefund: null });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();

    expect(ui.getByRole('link', { name: 'Subir voucher' })).toBeTruthy();
    expect(ui.getByRole('link', { name: 'Historial de pagos' })).toBeTruthy();
    TestBed.inject(HttpTestingController).expectNone((req) =>
      req.url.endsWith('/bff/temporary-guest/payment-status'),
    );
  });

  it('shows a temporary guest the state of its stay (T1), not the contract entries', async () => {
    const { fixture, ui } = await setup({
      role: 'GUEST',
      guestType: 'TEMPORARY',
      name: 'guest',
      mustChangePassword: false,
    });
    TestBed.inject(HttpTestingController)
      .expectOne((req) => req.url.endsWith('/bff/temporary-guest/payment-status'))
      .flush({
        stayId: 's1',
        startDate: '2026-10-20',
        endDate: '2026-10-31',
        status: 'UNPAID',
        agreedAmount: 400,
        paymentId: null,
        rejectionReason: null,
        surplus: null,
      });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();

    expect(ui.getByRole('link', { name: 'Subir pago' })).toBeTruthy();
    expect(ui.queryByRole('link', { name: 'Historial de pagos' })).toBeNull();
    // The temporary guest has no credit (RN-38): its own credit is never asked.
    TestBed.inject(HttpTestingController).expectNone((req) =>
      req.url.endsWith('/bff/guest/credit'),
    );
  });
});
