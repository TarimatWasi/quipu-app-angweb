import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { fireEvent, within } from '@testing-library/dom';
import { AuthService, Role } from '@core/services/auth.service';
import { HomeComponent } from './home.component';

const isLogin = (req: HttpRequest<unknown>) => req.url.endsWith('/bff/auth/login');

@Component({ selector: 'app-login-stub', template: '' })
class LoginStubComponent {}

async function setup(session: { role: Role; name: string; mustChangePassword: boolean }) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'login', component: LoginStubComponent }]),
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });
  const auth = TestBed.inject(AuthService);
  auth.login({ documentType: 'DNI', documentNumber: '12345678', password: 'secret-1' }).subscribe();
  TestBed.inject(HttpTestingController).expectOne(isLogin).flush(session);
  const fixture = TestBed.createComponent(HomeComponent);
  await fixture.whenStable();
  return { auth, fixture, ui: within(fixture.nativeElement as HTMLElement) };
}

describe('HomeComponent', () => {
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

  it('warns that the password change is pending when the account must change it', async () => {
    const { ui } = await setup({ role: 'ADMIN', name: 'a', mustChangePassword: true });

    const notice = ui.getByRole('status');
    expect(notice.textContent).toMatch(/cambiar tu contraseña/);
    expect(notice.textContent).toMatch(/pendiente/);
  });

  it('shows no password notice otherwise', async () => {
    const { ui } = await setup({ role: 'ADMIN', name: 'a', mustChangePassword: false });

    expect(ui.queryByRole('status')).toBeNull();
  });

  it('forgets the session and goes to /login when the user leaves', async () => {
    const { auth, ui, fixture } = await setup({
      role: 'ADMIN',
      name: 'a',
      mustChangePassword: false,
    });

    fireEvent.click(ui.getByRole('button', { name: 'Salir' }));
    await fixture.whenStable();

    expect(auth.session()).toBeNull();
    await vi.waitFor(() => {
      expect(TestBed.inject(Router).url).toBe('/login');
    });
  });
});
