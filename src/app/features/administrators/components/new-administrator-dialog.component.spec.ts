import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { fireEvent, screen, within } from '@testing-library/dom';
import { Subject } from 'rxjs';
import type { AdministratorCreated, AdministratorInput } from '../model/administrator';
import {
  NEW_ADMIN_LEAD_ID,
  NewAdministratorResult,
  openNewAdministratorDialog,
} from './new-administrator-dialog.component';

@Component({ selector: 'app-opener', template: '' })
class OpenerComponent {
  readonly dialog = inject(MatDialog);
}

function httpError(status: number, body: Record<string, string>): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: body, statusText: 'Error' });
}

async function setup() {
  const answers = new Subject<AdministratorCreated>();
  const create = vi.fn<(input: AdministratorInput) => Subject<AdministratorCreated>>(() => answers);
  const fixture = TestBed.createComponent(OpenerComponent);
  const ref = openNewAdministratorDialog(fixture.componentInstance.dialog, {
    create: (input) => create(input),
  });
  const closed = vi.fn<(result: NewAdministratorResult | undefined) => void>();
  ref.afterClosed().subscribe(closed);
  await fixture.whenStable();
  const box = () => screen.getByRole('dialog', { name: 'Nuevo administrador' });
  const dialog = () => within(box());
  const type = async (label: string, value: string) => {
    fireEvent.input(dialog().getByLabelText(label), { target: { value } });
    await fixture.whenStable();
  };
  const fill = async (documentNumber = '12345678', email = 'nuevo@example.com') => {
    await type('Número de documento', documentNumber);
    await type('Correo de su cuenta', email);
    await type('Tu contraseña', 'Quipu2026');
  };
  const submit = async () => {
    fireEvent.click(dialog().getByRole('button', { name: 'Crear administrador' }));
    await fixture.whenStable();
  };
  // The dialog is editable again once the answer is in: then its errors are on screen.
  const settled = () =>
    vi.waitFor(async () => {
      await fixture.whenStable();
      expect(within(box()).getByRole('button', { name: 'Crear administrador' })).toBeTruthy();
    });
  const fail = async (error: unknown) => {
    answers.error(error);
    await settled();
  };
  return { fixture, create, answers, closed, box, dialog, type, fill, submit, fail };
}

/** The text of the error tied to a field by aria-describedby. */
function errorOf(input: HTMLElement): string | undefined {
  const ids = input.getAttribute('aria-describedby')?.split(' ') ?? [];
  return ids
    .map((id) => document.getElementById(id))
    .find((element) => element?.classList.contains('quipu-field-error'))
    ?.textContent.trim();
}

describe('NewAdministratorDialogComponent (A7)', () => {
  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
  });

  it('is a P-16 dialog with its lead, the three document types, the fields and their helps', async () => {
    const { box, dialog } = await setup();

    expect(box().getAttribute('aria-describedby')).toBe(NEW_ADMIN_LEAD_ID);
    expect(document.getElementById(NEW_ADMIN_LEAD_ID)?.textContent.trim()).toBe(
      'Podrá hacer todo lo que haces tú. Escribe su documento y el correo al que le llegará el enlace.',
    );
    const types = within(dialog().getByRole('group', { name: 'Tipo de documento' }));
    expect(
      types
        .getAllByRole('button')
        .map((b) => [b.textContent.trim(), b.getAttribute('aria-pressed')]),
    ).toEqual([
      ['DNI', 'true'],
      ['Carné de extranjería', 'false'],
      ['Pasaporte', 'false'],
    ]);
    expect(dialog().getByText(/Le enviaremos un enlace de 30 minutos/)).toBeTruthy();
    expect(dialog().getByText('Para confirmar que eres tú.')).toBeTruthy();
    expect(dialog().getByLabelText('Tu contraseña').getAttribute('type')).toBe('password');
    const actions = box().querySelector<HTMLElement>('mat-dialog-actions');
    expect(
      within(actions ?? box())
        .getAllByRole('button')
        .map((b) => b.textContent.trim()),
    ).toEqual(['Cancelar', 'Crear administrador']);
  });

  it('checks every field before calling the BFF', async () => {
    const { create, dialog, submit, type } = await setup();

    await submit();

    expect(errorOf(dialog().getByLabelText('Número de documento'))).toBe(
      'Escribe el número de documento.',
    );
    expect(errorOf(dialog().getByLabelText('Correo de su cuenta'))).toBe(
      'Ingresa un correo válido',
    );
    expect(errorOf(dialog().getByLabelText('Tu contraseña'))).toBe('Escribe tu contraseña.');
    await type('Número de documento', '1234');
    await type('Correo de su cuenta', 'no-es-correo');
    expect(errorOf(dialog().getByLabelText('Número de documento'))).toBe('El DNI tiene 8 dígitos.');
    expect(errorOf(dialog().getByLabelText('Correo de su cuenta'))).toBe(
      'Ingresa un correo válido',
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('checks the number against the chosen type: a passport takes letters', async () => {
    const { create, dialog, fill, fixture, submit } = await setup();
    await fill('AB-1234');
    await submit();
    expect(errorOf(dialog().getByLabelText('Número de documento'))).toBe('El DNI tiene 8 dígitos.');

    fireEvent.click(dialog().getByRole('button', { name: 'Pasaporte' }));
    await fixture.whenStable();
    expect(dialog().getByRole('button', { name: 'Pasaporte' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(errorOf(dialog().getByLabelText('Número de documento'))).toBeUndefined();
    await submit();

    expect(create).toHaveBeenCalledWith({
      documentType: 'PASSPORT',
      documentNumber: 'AB-1234',
      email: 'nuevo@example.com',
      currentPassword: 'Quipu2026',
    });
  });

  it('sends the trimmed data, says «Creando…» meanwhile and closes with the email and emailSent', async () => {
    const { answers, closed, create, dialog, fill, submit } = await setup();
    await fill(' 12345678 ');

    await submit();

    expect(create).toHaveBeenCalledWith({
      documentType: 'DNI',
      documentNumber: '12345678',
      email: 'nuevo@example.com',
      currentPassword: 'Quipu2026',
    });
    const busy = dialog().getByRole('button', { name: 'Creando…' });
    expect(busy.hasAttribute('disabled')).toBe(true);
    answers.next({ id: 'n1', emailSent: false });
    answers.complete();

    await vi.waitFor(() => {
      expect(closed).toHaveBeenCalledWith({ email: 'nuevo@example.com', emailSent: false });
    });
  });

  it.each([
    [
      'the document is taken',
      'Número de documento',
      { code: 'ACCOUNT_DOCUMENT_TAKEN', field: 'documentNumber' },
      'Ese documento ya pertenece a una cuenta',
    ],
    [
      'the email is taken',
      'Correo de su cuenta',
      { code: 'ACCOUNT_EMAIL_TAKEN', field: 'email' },
      'Ese correo ya está en uso por otra cuenta',
    ],
  ])('puts the 409 when %s under its field and stays open', async (_case, label, body, text) => {
    const { closed, dialog, fail, fill, submit } = await setup();
    await fill();
    await submit();

    await fail(httpError(409, { ...body, message: 'texto del servidor' }));

    const input = dialog().getByLabelText(label);
    expect(errorOf(input)).toBe(text);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(dialog().queryByText('texto del servidor')).toBeNull();
    expect(closed).not.toHaveBeenCalled();
  });

  it('puts a wrong password under «Tu contraseña» with its own text', async () => {
    const { dialog, fail, fill, submit } = await setup();
    await fill();
    await submit();

    await fail(
      httpError(403, {
        code: 'AUTH_INVALID_CREDENTIALS',
        field: 'currentPassword',
        message: 'Documento o contraseña incorrectos',
      }),
    );

    expect(errorOf(dialog().getByLabelText('Tu contraseña'))).toBe('Tu contraseña no es correcta.');
    expect(dialog().getByRole('button', { name: 'Crear administrador' })).toBeTruthy();
  });

  it('shows the maximum as the red notice above the form', async () => {
    const { box, fail, fill, submit } = await setup();
    await fill();
    await submit();

    await fail(httpError(409, { code: 'ADMIN_LIMIT_REACHED', message: 'x' }));

    const notice = within(box()).getByRole('alert');
    expect(notice.textContent.trim()).toBe(
      'Ya hay 5 administradores, el máximo. Desactiva uno antes de crear otro.',
    );
    const form = box().querySelector('form');
    const fields = box().querySelector('fieldset');
    expect(
      fields && notice.compareDocumentPosition(fields) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(form?.getAttribute('aria-describedby')).toBeNull();
  });

  it('puts «too many attempts» under the form and does not try again by itself', async () => {
    const { box, create, fail, fill, submit } = await setup();
    await fill();
    await submit();

    await fail(httpError(429, { code: 'RATE_LIMITED', message: 'x' }));

    const alert = within(box()).getByRole('alert');
    expect(alert.textContent.trim()).toBe(
      'Demasiados intentos, espera un momento antes de volver a intentar',
    );
    expect(alert.id).toBe('new-admin-error');
    expect(box().querySelector('form')?.getAttribute('aria-describedby')).toBe('new-admin-error');
    const password = within(box()).getByLabelText('Tu contraseña');
    expect(password.compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('only goes away on a 401: the session interceptor takes the person to the login', async () => {
    const { answers, closed, fill, submit } = await setup();
    await fill();
    await submit();

    answers.error(httpError(401, { code: 'AUTH_NO_SESSION', message: 'x' }));

    await vi.waitFor(() => {
      expect(closed).toHaveBeenCalledWith(undefined);
    });
  });

  it('«Cancelar» closes without creating', async () => {
    const { closed, create, dialog } = await setup();

    fireEvent.click(dialog().getByRole('button', { name: 'Cancelar' }));

    await vi.waitFor(() => {
      expect(closed).toHaveBeenCalledWith(undefined);
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('a network failure is told under the form, not as a field error', async () => {
    const { box, dialog, fail, fill, submit } = await setup();
    await fill();
    await submit();

    await fail(new Error('boom'));

    expect(within(box()).getByRole('alert').textContent.trim()).toBe(
      'Ocurrió un error inesperado. Inténtalo de nuevo.',
    );
    expect(errorOf(dialog().getByLabelText('Tu contraseña'))).toBeUndefined();
  });
});
