import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { within } from '@testing-library/dom';
import { firstValueFrom } from 'rxjs';
import { AuthService, Role } from '@core/auth/auth.service';
import { AccountHomeComponent } from './account-home.component';

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
  const fixture = TestBed.createComponent(AccountHomeComponent);
  // A resource keeps the app unstable while it reads: tick instead of waiting for it.
  TestBed.tick();
  return { auth, fixture, ui: within(fixture.nativeElement as HTMLElement) };
}

describe('AccountHomeComponent', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
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

    expect(ui.getByRole('heading', { level: 1, name: 'Estado de cuenta' })).toBeTruthy();
    expect(ui.getByRole('link', { name: 'Ver el historial de pagos' })).toBeTruthy();
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

    expect(ui.getByRole('heading', { level: 1, name: 'Estado de pago' })).toBeTruthy();
    expect(ui.getByRole('link', { name: 'Subir voucher' })).toBeTruthy();
    expect(ui.queryByRole('link', { name: 'Ver el historial de pagos' })).toBeNull();
    // The temporary guest has no credit (RN-38): its own credit is never asked.
    TestBed.inject(HttpTestingController).expectNone((req) =>
      req.url.endsWith('/bff/guest/credit'),
    );
  });

  it('shows the administrator nothing and asks nothing of the guest', async () => {
    const { fixture } = await setup({ role: 'ADMIN', name: 'admin', mustChangePassword: false });

    expect((fixture.nativeElement as HTMLElement).textContent.trim()).toBe('');
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });
});
