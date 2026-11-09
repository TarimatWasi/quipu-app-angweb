import { HttpErrorResponse } from '@angular/common/http';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { fireEvent, within } from '@testing-library/dom';
import { of, throwError } from 'rxjs';
import { openEmailChangeDialog } from './email-change-dialog.component';
import type { EmailChangeData } from './email-change-dialog.component';
import type { EmailVerificationClient } from './email-verification';

const refused = (status: number, code: string, field: string, extra = {}) =>
  throwError(
    () =>
      new HttpErrorResponse({ status, error: { code, message: 'del servidor', field, ...extra } }),
  );

describe('EmailChangeDialogComponent (TAR-349)', () => {
  function open(data: Partial<EmailChangeData> & { client: EmailVerificationClient }) {
    const ref = openEmailChangeDialog(TestBed.inject(MatDialog), {
      current: 'ana@correo.pe',
      pending: null,
      ...data,
    });
    const closed = vi.fn();
    ref.afterClosed().subscribe(closed);
    const tick = () => {
      TestBed.inject(ApplicationRef).tick();
    };
    tick();
    return { closed, tick, ui: within(document.body) };
  }

  function client(overrides: Partial<EmailVerificationClient> = {}): EmailVerificationClient {
    return {
      request: vi.fn(() => of(null)),
      confirm: vi.fn(() => of(null)),
      ...overrides,
    };
  }

  function type(input: HTMLElement, value: string): void {
    fireEvent.input(input, { target: { value } });
  }

  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
  });

  it('sends a code to the new address, then confirms it and answers the new email', async () => {
    const request = vi.fn(() => of(null));
    const confirm = vi.fn(() => of(null));
    const { ui, tick, closed } = open({ client: { request, confirm } });

    expect(ui.getByRole('heading', { name: 'Cambiar correo' })).toBeTruthy();
    type(ui.getByLabelText('Correo nuevo'), ' luis@correo.pe ');
    fireEvent.click(ui.getByRole('button', { name: 'Enviar código' }));

    await vi.waitFor(() => {
      tick();
      expect(ui.getByLabelText('Código')).toBeTruthy();
    });
    expect(request).toHaveBeenCalledWith('luis@correo.pe');
    expect(ui.getByText(/enviamos a luis@correo\.pe/)).toBeTruthy();
    expect(ui.getByRole('button', { name: /^Reenviar en / })).toHaveProperty('disabled', true);

    type(ui.getByLabelText('Código'), '123 456');
    fireEvent.click(ui.getByRole('button', { name: 'Confirmar correo' }));

    await vi.waitFor(() => {
      expect(closed).toHaveBeenCalledWith('luis@correo.pe');
    });
    expect(confirm).toHaveBeenCalledWith('123456');
  });

  it('says «Agregar correo» to a guest without one', () => {
    const { ui } = open({ current: null, client: client() });
    expect(ui.getByRole('heading', { name: 'Agregar correo' })).toBeTruthy();
  });

  it('checks the address before calling the BFF', async () => {
    const request = vi.fn(() => of(null));
    const { ui, tick } = open({ client: client({ request }) });

    type(ui.getByLabelText('Correo nuevo'), 'luis@');
    fireEvent.click(ui.getByRole('button', { name: 'Enviar código' }));

    await vi.waitFor(() => {
      tick();
      expect(ui.getByText('Escribe un correo válido.')).toBeTruthy();
    });
    expect(request).not.toHaveBeenCalled();
  });

  it('puts a taken address under the field, with the local text', async () => {
    const { ui, tick } = open({
      client: client({ request: () => refused(409, 'ACCOUNT_EMAIL_TAKEN', 'email') }),
    });

    type(ui.getByLabelText('Correo nuevo'), 'luis@correo.pe');
    fireEvent.click(ui.getByRole('button', { name: 'Enviar código' }));

    await vi.waitFor(() => {
      tick();
      expect(ui.getByText('Ese correo ya está en uso por otra cuenta')).toBeTruthy();
    });
    expect(ui.queryByText('del servidor')).toBeNull();
  });

  it('opens on the code when one is pending, and «Usar otro correo» goes back', () => {
    const { ui, tick } = open({ pending: 'luis@correo.pe', client: client() });

    expect(ui.getByLabelText('Código')).toBeTruthy();
    // The wait of a code sent before is unknown: «Reenviar código» is offered.
    expect(ui.getByRole('button', { name: 'Reenviar código' })).toHaveProperty('disabled', false);

    fireEvent.click(ui.getByRole('button', { name: 'Usar otro correo' }));
    tick();
    expect(ui.getByLabelText<HTMLInputElement>('Correo nuevo').value).toBe('luis@correo.pe');
  });

  it('counts the wait the BFF reports when «Reenviar código» comes too soon', async () => {
    const { ui, tick } = open({
      pending: 'luis@correo.pe',
      client: client({
        request: () =>
          refused(429, 'EMAIL_VERIFICATION_COOLDOWN', 'email', { retryAfterSeconds: 42 }),
      }),
    });

    fireEvent.click(ui.getByRole('button', { name: 'Reenviar código' }));

    await vi.waitFor(() => {
      tick();
      expect(ui.getByRole('alert').textContent).toContain(
        'Espera 42 segundos para pedir otro código.',
      );
    });
    expect(ui.getByRole('button', { name: /^Reenviar en 0:4/ })).toHaveProperty('disabled', true);
  });

  it('puts a wrong code under the field and an expired one above the buttons', async () => {
    let answer = 'EMAIL_VERIFICATION_INVALID';
    const { ui, tick, closed } = open({
      pending: 'luis@correo.pe',
      client: client({ confirm: () => refused(400, answer, 'code') }),
    });

    type(ui.getByLabelText('Código'), '111111');
    fireEvent.click(ui.getByRole('button', { name: 'Confirmar correo' }));
    await vi.waitFor(() => {
      tick();
      expect(ui.getByText('El código no es correcto. Revísalo e inténtalo de nuevo.')).toBeTruthy();
    });

    answer = 'EMAIL_VERIFICATION_EXPIRED';
    type(ui.getByLabelText('Código'), '222222');
    fireEvent.click(ui.getByRole('button', { name: 'Confirmar correo' }));
    await vi.waitFor(() => {
      tick();
      expect(ui.getByRole('alert').textContent).toContain('Pide uno nuevo.');
    });
    expect(closed).not.toHaveBeenCalled();
  });

  it('closes without an answer on «Cancelar»', async () => {
    const { ui, closed } = open({ client: client() });
    fireEvent.click(ui.getByRole('button', { name: 'Cancelar' }));
    await vi.waitFor(() => {
      expect(closed).toHaveBeenCalledWith(undefined);
    });
  });
});
