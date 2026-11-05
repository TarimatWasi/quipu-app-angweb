import { HttpRequest, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter, Router } from '@angular/router';
import { fireEvent, screen, within } from '@testing-library/dom';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { sessionExpiredInterceptor } from '@core/interceptors/session-expired.interceptor';
import {
  CHANGE_PASSWORD_TEXT_ID,
  openChangePasswordDialog,
} from './change-password-dialog.component';

const isLogin = (req: HttpRequest<unknown>) => req.url.endsWith('/bff/auth/login');
const isLogout = (req: HttpRequest<unknown>) => req.url.endsWith('/bff/auth/logout');
const isChange = (req: HttpRequest<unknown>) => req.url.endsWith('/bff/auth/change-password');
const CURRENT = 'Actual12345';
const NEW = 'Nueva12345';

@Component({ selector: 'app-page-stub', template: '' })
class PageStubComponent {}

@Component({ selector: 'app-opener', template: '' })
class OpenerComponent {
  readonly dialog = inject(MatDialog);
}

async function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(
        ['home', 'login', 'forgot-password'].map((path) => ({
          path,
          component: PageStubComponent,
        })),
      ),
      provideHttpClient(withInterceptors([sessionExpiredInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  const controller = TestBed.inject(HttpTestingController);
  const auth = TestBed.inject(AuthService);
  const signedIn = firstValueFrom(
    auth.login({ documentType: 'DNI', documentNumber: '12345678', password: CURRENT }),
  );
  controller
    .expectOne(isLogin)
    .flush({ role: 'ADMIN', name: 'Rosa Quispe', mustChangePassword: false });
  await signedIn;
  await TestBed.inject(Router).navigateByUrl('/home');
  const fixture = TestBed.createComponent(OpenerComponent);
  const ref = openChangePasswordDialog(fixture.componentInstance.dialog);
  const closed = vi.fn<(result: boolean | undefined) => void>();
  ref.afterClosed().subscribe(closed);
  await fixture.whenStable();
  const dialog = () => within(screen.getByRole('dialog', { name: 'Cambiar contraseña' }));
  const type = async (label: string, value: string) => {
    fireEvent.input(dialog().getByLabelText(label), { target: { value } });
    await fixture.whenStable();
  };
  const fillBoth = async () => {
    await type('Contraseña actual', CURRENT);
    await type('Nueva contraseña', NEW);
  };
  const submit = async () => {
    fireEvent.click(dialog().getByRole('button', { name: 'Cambiar contraseña' }));
    await fixture.whenStable();
  };
  const request = () => vi.waitFor(() => controller.expectOne(isChange));
  const reject = async (status: number, body: Record<string, string>) => {
    (await request()).flush(body, { status, statusText: 'Error' });
    await fixture.whenStable();
  };
  return { auth, controller, fixture, closed, dialog, type, fillBoth, submit, request, reject };
}

describe('ChangePasswordDialogComponent (A0.6)', () => {
  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
    TestBed.inject(HttpTestingController).verify();
  });

  it('is a P-16 dialog titled «Cambiar contraseña», described by its sentence', async () => {
    const { dialog } = await setup();

    const box = screen.getByRole('dialog', { name: 'Cambiar contraseña' });
    expect(box.getAttribute('aria-describedby')).toBe(CHANGE_PASSWORD_TEXT_ID);
    expect(document.getElementById(CHANGE_PASSWORD_TEXT_ID)?.textContent.trim()).toBe(
      'Seguirás con la sesión abierta aquí. La próxima vez entra con la contraseña nueva.',
    );
    const current = dialog().getByLabelText('Contraseña actual');
    expect(current.getAttribute('type')).toBe('password');
    expect(current.getAttribute('autocomplete')).toBe('current-password');
    expect(dialog().getByLabelText('Nueva contraseña').getAttribute('autocomplete')).toBe(
      'new-password',
    );
    expect(dialog().getByText('Mínimo 8 caracteres.')).toBeTruthy();
    expect(dialog().getByRole('link', { name: '¿No la recuerdas?' })).toBeTruthy();
    const actions = box.querySelector('mat-dialog-actions');
    expect(
      within(actions as HTMLElement)
        .getAllByRole('button')
        .map((button) => button.textContent.trim()),
    ).toEqual(['Cancelar', 'Cambiar contraseña']);
  });

  it('asks for both passwords without calling the BFF when they are empty', async () => {
    const { controller, dialog, submit } = await setup();

    await submit();

    expect(dialog().getByText('Ingresa tu contraseña actual')).toBeTruthy();
    expect(dialog().getByText('Ingresa tu nueva contraseña')).toBeTruthy();
    expect(dialog().getByLabelText('Contraseña actual').getAttribute('aria-invalid')).toBe('true');
    controller.expectNone(isChange);
  });

  it('sends the current and the new password, says «Guardando…» meanwhile, closes with true and keeps the session', async () => {
    const { auth, closed, dialog, fillBoth, submit, request, fixture } = await setup();
    await fillBoth();

    await submit();
    const req = await request();
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ currentPassword: CURRENT, newPassword: NEW });
    const saving = dialog().getByRole('button', { name: 'Guardando…' });
    expect(saving.hasAttribute('disabled')).toBe(true);
    expect(dialog().getByRole('button', { name: 'Cancelar' }).hasAttribute('disabled')).toBe(true);
    req.flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();

    await vi.waitFor(() => {
      expect(closed).toHaveBeenCalledWith(true);
    });
    expect(auth.session()).toEqual({
      role: 'ADMIN',
      name: 'Rosa Quispe',
      mustChangePassword: false,
    });
    expect(TestBed.inject(Router).url).toBe('/home');
  });

  it('a wrong current password is told under «Contraseña actual» and the dialog stays', async () => {
    const { closed, dialog, fillBoth, submit, reject } = await setup();
    await fillBoth();
    await submit();

    await reject(403, {
      code: 'AUTH_INVALID_CREDENTIALS',
      message: 'Documento o contraseña incorrectos',
      field: 'currentPassword',
    });

    const current = dialog().getByLabelText('Contraseña actual');
    await vi.waitFor(() => {
      expect(current.getAttribute('aria-invalid')).toBe('true');
    });
    const error = dialog().getByText('Tu contraseña actual no es correcta.');
    expect(current.getAttribute('aria-describedby')).toContain(error.id);
    expect(dialog().getByLabelText('Nueva contraseña').getAttribute('aria-invalid')).toBeNull();
    expect(dialog().queryByText('Documento o contraseña incorrectos')).toBeNull();
    expect(closed).not.toHaveBeenCalled();
    expect(dialog().getByRole('button', { name: 'Cambiar contraseña' })).toBeTruthy();
  });

  it('a weak password is told under the new one', async () => {
    const { dialog, fillBoth, submit, reject } = await setup();
    await fillBoth();
    await submit();

    await reject(400, { code: 'AUTH_WEAK_PASSWORD', message: 'x', field: 'newPassword' });

    const field = dialog().getByLabelText('Nueva contraseña');
    await vi.waitFor(() => {
      expect(field.getAttribute('aria-invalid')).toBe('true');
    });
    expect(dialog().getByText('Mínimo 8 caracteres').id).toBe('new-password-error');
    expect(dialog().getByLabelText('Contraseña actual').getAttribute('aria-invalid')).toBeNull();
  });

  it('the same password as the current one is told under the new one, with the text of this dialog', async () => {
    const { dialog, fillBoth, submit, reject } = await setup();
    await fillBoth();
    await submit();

    await reject(400, { code: 'AUTH_PASSWORD_UNCHANGED', message: 'x', field: 'newPassword' });

    expect((await dialog().findByText('Elige una contraseña distinta de la actual')).id).toBe(
      'new-password-error',
    );
    expect(dialog().queryByText('Elige una contraseña distinta de la temporal')).toBeNull();
  });

  it('too many attempts are told in an alert under the form, without trying again', async () => {
    const { controller, dialog, fillBoth, submit, reject, fixture } = await setup();
    await fillBoth();
    await submit();

    await reject(429, { code: 'RATE_LIMITED', message: 'x' });

    const alert = await dialog().findByText(
      'Demasiados intentos, espera un momento antes de volver a intentar',
    );
    expect(alert.classList).toContain('quipu-alert');
    expect(dialog().getByLabelText('Contraseña actual').getAttribute('aria-invalid')).toBeNull();
    expect(dialog().getByLabelText('Nueva contraseña').getAttribute('aria-invalid')).toBeNull();
    await fixture.whenStable();
    controller.expectNone(isChange);
  });

  it('a server that cannot be reached is told in the same alert', async () => {
    const { dialog, fillBoth, submit, request, fixture } = await setup();
    await fillBoth();
    await submit();

    (await request()).error(new ProgressEvent('error'));
    await fixture.whenStable();

    const alert = await dialog().findByText(
      'No se pudo conectar con el servidor. Inténtalo de nuevo.',
    );
    expect(alert.classList).toContain('quipu-alert');
  });

  it('a 401 is left to the session interceptor: the dialog says nothing and goes away with the page', async () => {
    const { auth, closed, fillBoth, submit, reject } = await setup();
    await fillBoth();
    await submit();

    await reject(401, { code: 'AUTH_NO_SESSION', message: 'x' });

    await vi.waitFor(() => {
      expect(closed).toHaveBeenCalledWith(undefined);
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText('Ocurrió un error inesperado. Inténtalo de nuevo.')).toBeNull();
    expect(auth.session()).toBeNull();
    await vi.waitFor(() => {
      expect(TestBed.inject(Router).url).toBe('/login?expired=1&returnUrl=%2Fhome');
    });
  });

  it('«Cancelar» closes without calling the BFF', async () => {
    const { controller, closed, dialog, fillBoth } = await setup();
    await fillBoth();

    fireEvent.click(dialog().getByRole('button', { name: 'Cancelar' }));

    await vi.waitFor(() => {
      expect(closed).toHaveBeenCalledWith(undefined);
    });
    controller.expectNone(isChange);
  });

  it('«¿No la recuerdas?» does nothing while a change is on its way', async () => {
    const { controller, closed, dialog, fillBoth, submit, request, fixture } = await setup();
    await fillBoth();
    await submit();
    const req = await request();

    const link = dialog().getByRole('link', { name: '¿No la recuerdas?' });
    expect(link.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(link);
    await fixture.whenStable();

    controller.expectNone(isLogout);
    expect(closed).not.toHaveBeenCalled();
    req.flush(null, { status: 204, statusText: 'No Content' });
    await vi.waitFor(() => {
      expect(closed).toHaveBeenCalledWith(true);
    });
  });

  it('«¿No la recuerdas?» closes the dialog, closes the session and goes to /forgot-password', async () => {
    const { auth, controller, closed, dialog } = await setup();

    fireEvent.click(dialog().getByRole('link', { name: '¿No la recuerdas?' }));

    await vi.waitFor(() => {
      expect(closed).toHaveBeenCalledWith(undefined);
    });
    controller.expectOne(isLogout).flush(null, { status: 204, statusText: 'No Content' });
    await vi.waitFor(() => {
      expect(TestBed.inject(Router).url).toBe('/forgot-password');
    });
    expect(auth.session()).toBeNull();
    controller.expectNone(isChange);
  });
});
