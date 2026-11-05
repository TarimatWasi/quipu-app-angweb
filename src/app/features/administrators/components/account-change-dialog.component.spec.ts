import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { fireEvent, screen, within } from '@testing-library/dom';
import { Subject } from 'rxjs';
import type { AdministratorAction } from '../model/administrator';
import { ACCOUNT_CHANGE_LEAD_ID, openAccountChangeDialog } from './account-change-dialog.component';

@Component({ selector: 'app-opener', template: '' })
class OpenerComponent {
  readonly dialog = inject(MatDialog);
}

function httpError(status: number, code: string, field?: string): HttpErrorResponse {
  const body = { code, message: 'texto del servidor', ...(field ? { field } : {}) };
  return new HttpErrorResponse({ status, error: body, statusText: 'Error' });
}

async function setup(action: AdministratorAction, who = 'Julio Mamani') {
  const answers = new Subject<void>();
  const change = vi.fn<(currentPassword: string) => Subject<void>>(() => answers);
  const fixture = TestBed.createComponent(OpenerComponent);
  const ref = openAccountChangeDialog(fixture.componentInstance.dialog, {
    action,
    who,
    change: (password) => change(password),
  });
  const closed = vi.fn<(result: boolean | undefined) => void>();
  ref.afterClosed().subscribe(closed);
  await fixture.whenStable();
  const box = () => screen.getByRole('dialog');
  const button = action === 'deactivate' ? 'Desactivar' : 'Reactivar';
  const confirm = async (password = 'Quipu2026') => {
    fireEvent.input(within(box()).getByLabelText('Tu contraseña'), {
      target: { value: password },
    });
    await fixture.whenStable();
    fireEvent.click(within(box()).getByRole('button', { name: button }));
    await fixture.whenStable();
  };
  const fail = async (error: HttpErrorResponse) => {
    answers.error(error);
    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(within(box()).getByRole('button', { name: button })).toBeTruthy();
    });
  };
  return { fixture, answers, change, closed, box, confirm, fail };
}

function passwordError(box: HTMLElement): string | undefined {
  return box.querySelector('#account-change-password-error')?.textContent.trim();
}

describe('AccountChangeDialogComponent (A7)', () => {
  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
  });

  it('asks to deactivate by name, with its lead, only the password and the danger button', async () => {
    const { box } = await setup('deactivate');

    expect(screen.getByRole('dialog', { name: '¿Desactivar a Julio Mamani?' })).toBe(box());
    expect(box().getAttribute('aria-describedby')).toBe(ACCOUNT_CHANGE_LEAD_ID);
    expect(document.getElementById(ACCOUNT_CHANGE_LEAD_ID)?.textContent.trim()).toBe(
      'Dejará de entrar a Quipu desde ahora, aunque tenga la sesión abierta. Lo que hizo se conserva y puedes reactivarlo cuando quieras.',
    );
    expect(box().querySelectorAll('input')).toHaveLength(1);
    expect(within(box()).getByText('Para confirmar que eres tú.')).toBeTruthy();
    const confirm = within(box()).getByRole('button', { name: 'Desactivar' });
    expect(confirm.classList.contains('quipu-button--danger')).toBe(true);
    expect(confirm.classList.contains('quipu-button--primary')).toBe(false);
  });

  it('asks to reactivate with its own lead and the primary button', async () => {
    const { box } = await setup('reactivate', 'carmen@example.com');

    expect(screen.getByRole('dialog', { name: '¿Reactivar a carmen@example.com?' })).toBe(box());
    expect(document.getElementById(ACCOUNT_CHANGE_LEAD_ID)?.textContent.trim()).toBe(
      'Podrá entrar a Quipu de nuevo desde ahora, con su documento y la contraseña que tenía.',
    );
    const confirm = within(box()).getByRole('button', { name: 'Reactivar' });
    expect(confirm.classList.contains('quipu-button--primary')).toBe(true);
  });

  it('asks for the password before calling the BFF', async () => {
    const { box, change, confirm } = await setup('deactivate');

    await confirm('');

    expect(passwordError(box())).toBe('Escribe tu contraseña.');
    expect(change).not.toHaveBeenCalled();
  });

  it('sends the password, says «Desactivando…» meanwhile and closes with true', async () => {
    const { answers, box, change, closed, confirm } = await setup('deactivate');

    await confirm('Quipu2026');

    expect(change).toHaveBeenCalledWith('Quipu2026');
    const busy = within(box()).getByRole('button', { name: 'Desactivando…' });
    expect(busy.hasAttribute('disabled')).toBe(true);
    answers.next();
    answers.complete();
    await vi.waitFor(() => {
      expect(closed).toHaveBeenCalledWith(true);
    });
  });

  it('closes with true on a 204 that brings no value', async () => {
    const { answers, closed, confirm } = await setup('reactivate');
    await confirm();

    answers.complete();

    await vi.waitFor(() => {
      expect(closed).toHaveBeenCalledWith(true);
    });
  });

  it('puts a wrong password under the field', async () => {
    const { box, closed, confirm, fail } = await setup('deactivate');
    await confirm();

    await fail(httpError(403, 'AUTH_INVALID_CREDENTIALS', 'currentPassword'));

    expect(passwordError(box())).toBe('Tu contraseña no es correcta.');
    expect(within(box()).getByLabelText('Tu contraseña').getAttribute('aria-invalid')).toBe('true');
    expect(closed).not.toHaveBeenCalled();
  });

  it.each([
    ['deactivate', 'ADMIN_SELF_DEACTIVATION', 'No puedes desactivar tu propia cuenta.'] as const,
    [
      'deactivate',
      'LAST_ACTIVE_ADMIN',
      'Es el único administrador activo: Quipu siempre necesita al menos uno. Crea o reactiva otro antes de desactivarlo.',
    ] as const,
    [
      'reactivate',
      'ADMIN_LIMIT_REACHED',
      'Ya hay 5 administradores activos, el máximo. Desactiva uno antes de reactivar a otro.',
    ] as const,
  ])('on %s shows %s as the red notice above the field', async (action, code, text) => {
    const { box, confirm, fail } = await setup(action);
    await confirm();

    await fail(httpError(409, code));

    const notice = within(box()).getByRole('alert');
    expect(notice.textContent.trim()).toBe(text);
    const field = within(box()).getByLabelText('Tu contraseña');
    expect(notice.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(box()).queryByText('texto del servidor')).toBeNull();
    expect(passwordError(box())).toBeUndefined();
  });

  it('puts «too many attempts» under the form and does not try again by itself', async () => {
    const { box, change, confirm, fail } = await setup('reactivate');
    await confirm();

    await fail(httpError(429, 'RATE_LIMITED'));

    const alert = within(box()).getByRole('alert');
    expect(alert.id).toBe('account-change-error');
    expect(alert.textContent.trim()).toBe(
      'Demasiados intentos, espera un momento antes de volver a intentar',
    );
    expect(change).toHaveBeenCalledTimes(1);
  });

  it('only goes away on a 401', async () => {
    const { answers, closed, confirm } = await setup('deactivate');
    await confirm();

    answers.error(httpError(401, 'AUTH_NO_SESSION'));

    await vi.waitFor(() => {
      expect(closed).toHaveBeenCalledWith(undefined);
    });
  });
});
