import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { fireEvent, within } from '@testing-library/dom';
import { firstValueFrom } from 'rxjs';
import { AuthService, Role } from '@core/services/auth.service';
import { HomeComponent } from './home.component';

const isLogin = (req: HttpRequest<unknown>) => req.url.endsWith('/bff/auth/login');
const isLogout = (req: HttpRequest<unknown>) => req.url.endsWith('/bff/auth/logout');

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

  it('tells the BFF to close the session, forgets it and goes to /login when the user leaves', async () => {
    const { auth, ui, fixture } = await setup({
      role: 'ADMIN',
      name: 'a',
      mustChangePassword: false,
    });

    fireEvent.click(ui.getByRole('button', { name: 'Salir' }));
    TestBed.inject(HttpTestingController)
      .expectOne(isLogout)
      .flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();

    expect(auth.session()).toBeNull();
    await vi.waitFor(() => {
      expect(TestBed.inject(Router).url).toBe('/login');
    });
  });

  it('leaves even when the BFF cannot be reached', async () => {
    const { auth, ui, fixture } = await setup({
      role: 'ADMIN',
      name: 'a',
      mustChangePassword: false,
    });

    fireEvent.click(ui.getByRole('button', { name: 'Salir' }));
    TestBed.inject(HttpTestingController).expectOne(isLogout).error(new ProgressEvent('error'));
    await fixture.whenStable();

    expect(auth.session()).toBeNull();
    await vi.waitFor(() => {
      expect(TestBed.inject(Router).url).toBe('/login');
    });
  });
});
