import { HttpRequest, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { fireEvent, within } from '@testing-library/dom';
import { firstValueFrom } from 'rxjs';
import { credentialsInterceptor } from '@core/interceptors/credentials.interceptor';
import { AuthService } from '@core/services/auth.service';
import { ChangePasswordComponent } from './change-password.component';

const isLogin = (req: HttpRequest<unknown>) => req.url.endsWith('/bff/auth/login');
const isChange = (req: HttpRequest<unknown>) => req.url.endsWith('/bff/auth/change-password');
const VALID = 'Nueva12345';

@Component({ selector: 'app-home-stub', template: '' })
class HomeStubComponent {}

async function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'home', component: HomeStubComponent }]),
      provideHttpClient(withInterceptors([credentialsInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  const controller = TestBed.inject(HttpTestingController);
  // The page is only reachable for a session that must change its password.
  const auth = TestBed.inject(AuthService);
  const signedIn = firstValueFrom(
    auth.login({ documentType: 'DNI', documentNumber: '12345678', password: 'temporal-1' }),
  );
  controller.expectOne(isLogin).flush({ role: 'GUEST', name: 'huesped', mustChangePassword: true });
  await signedIn;
  const fixture = TestBed.createComponent(ChangePasswordComponent);
  await fixture.whenStable();
  const ui = within(fixture.nativeElement as HTMLElement);
  const fill = async (value: string) => {
    fireEvent.input(ui.getByLabelText('Nueva contraseña'), { target: { value } });
    await fixture.whenStable();
  };
  const submit = async () => {
    fireEvent.click(ui.getByRole('button', { name: 'Cambiar contraseña' }));
    await fixture.whenStable();
  };
  const request = () => vi.waitFor(() => controller.expectOne(isChange));
  return { auth, ui, controller, fill, submit, request };
}

describe('ChangePasswordComponent (A0.1, RF-12)', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('explains why the password must change and asks for the new one', async () => {
    const { ui } = await setup();

    expect(ui.getByRole('heading', { name: 'Cambia tu contraseña' })).toBeTruthy();
    expect(ui.getByText(/contraseña temporal/)).toBeTruthy();
    expect(ui.getByLabelText('Nueva contraseña')).toBeTruthy();
  });

  it('asks for a password without calling the BFF when the field is empty', async () => {
    const { ui, controller, submit } = await setup();

    await submit();

    expect(ui.getByText('Ingresa tu nueva contraseña')).toBeTruthy();
    controller.expectNone(isChange);
  });

  it('rejects fewer than 8 characters before calling the BFF', async () => {
    const { ui, controller, fill, submit } = await setup();
    await fill('corta12');

    await submit();

    expect(ui.getByText('Mínimo 8 caracteres')).toBeTruthy();
    controller.expectNone(isChange);
  });

  it('rejects a password that bcrypt could not hash before calling the BFF', async () => {
    const { ui, controller, fill, submit } = await setup();
    await fill('ñ'.repeat(37)); // 74 bytes in UTF-8

    await submit();

    expect(ui.getByText('La contraseña es demasiado larga')).toBeTruthy();
    controller.expectNone(isChange);
  });

  it('sends the new password, clears the pending change and goes to /home', async () => {
    const { auth, fill, submit, request } = await setup();
    await fill(VALID);

    await submit();
    const req = await request();
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ newPassword: VALID });
    req.flush(null, { status: 204, statusText: 'No Content' });

    await vi.waitFor(() => {
      expect(TestBed.inject(Router).url).toBe('/home');
    });
    expect(auth.session()?.mustChangePassword).toBe(false);
  });

  it('shows the weak-password error of the server under the field and stays on the page', async () => {
    const { ui, fill, submit, request } = await setup();
    await fill(VALID);
    await submit();

    (await request()).flush(
      { code: 'AUTH_WEAK_PASSWORD', message: 'x', field: 'newPassword' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(await ui.findByText('Mínimo 8 caracteres')).toBeTruthy();
    expect(ui.getByLabelText('Nueva contraseña').getAttribute('aria-invalid')).toBe('true');
    expect(TestBed.inject(Router).url).not.toBe('/home');
  });

  it('tells the user that the temporary password cannot be kept', async () => {
    const { ui, fill, submit, request } = await setup();
    await fill(VALID);
    await submit();

    (await request()).flush(
      { code: 'AUTH_PASSWORD_UNCHANGED', message: 'x', field: 'newPassword' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(await ui.findByText('Elige una contraseña distinta de la temporal')).toBeTruthy();
  });

  it('lets the user leave: forgets the session and goes to /login', async () => {
    const { auth, ui } = await setup();
    TestBed.inject(Router).resetConfig([{ path: 'login', component: HomeStubComponent }]);

    fireEvent.click(ui.getByRole('button', { name: 'Salir' }));

    await vi.waitFor(() => {
      expect(TestBed.inject(Router).url).toBe('/login');
    });
    expect(auth.session()).toBeNull();
  });

  it('shows a general error when the server cannot be reached', async () => {
    const { ui, fill, submit, request } = await setup();
    await fill(VALID);
    await submit();

    (await request()).error(new ProgressEvent('error'));

    expect(
      await ui.findByText('No se pudo conectar con el servidor. Inténtalo de nuevo.'),
    ).toBeTruthy();
  });
});
