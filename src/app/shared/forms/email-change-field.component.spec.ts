import { ApplicationRef, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { fireEvent, screen, within } from '@testing-library/dom';
import { of } from 'rxjs';
import { EmailChangeFieldComponent } from './email-change-field.component';
import type { EmailVerificationClient } from './email-verification';

const request = vi.fn(() => of(null));
const confirm = vi.fn(() => of(null));
const CLIENT: EmailVerificationClient = { request, confirm };

@Component({
  imports: [EmailChangeFieldComponent],
  template: `<app-email-change-field
    [current]="current()"
    [pending]="pending()"
    [client]="client"
    (changed)="changed.set($event)"
  />`,
})
class HostComponent {
  readonly current = signal<string | null>('ana@correo.pe');
  readonly pending = signal<string | null>(null);
  readonly changed = signal<string | null>(null);
  readonly client = CLIENT;
}

describe('EmailChangeFieldComponent (TAR-349)', () => {
  function setup() {
    const fixture = TestBed.createComponent(HostComponent);
    const tick = () => {
      TestBed.inject(ApplicationRef).tick();
    };
    tick();
    return {
      host: fixture.componentInstance,
      tick,
      page: within(fixture.nativeElement as HTMLElement),
    };
  }

  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
    request.mockClear();
    confirm.mockClear();
  });

  it('remembers the address a code went to when the dialog closes without the code', async () => {
    const { page, tick } = setup();

    fireEvent.click(page.getByRole('button', { name: 'Cambiar correo' }));
    tick();
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.input(dialog.getByLabelText('Correo nuevo'), { target: { value: 'ana@nuevo.pe' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Enviar código' }));
    await vi.waitFor(() => {
      tick();
      expect(dialog.getByLabelText('Código')).toBeTruthy();
    });
    fireEvent.click(dialog.getByRole('button', { name: 'Cancelar' }));

    await vi.waitFor(() => {
      tick();
      expect(
        page.getByText('Falta confirmar ana@nuevo.pe: escribe el código que te enviamos.'),
      ).toBeTruthy();
    });

    // «Escribir el código» opens on the code of that address, without asking for another one.
    await vi.waitFor(() => {
      tick();
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    fireEvent.click(page.getByRole('button', { name: 'Escribir el código' }));
    tick();
    const again = within(screen.getByRole('dialog'));
    expect(again.getByText(/enviamos a ana@nuevo\.pe/)).toBeTruthy();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('gives the new email and forgets the pending one once the code is confirmed', async () => {
    const { host, page, tick } = setup();
    host.pending.set('ana@nuevo.pe');
    tick();

    fireEvent.click(page.getByRole('button', { name: 'Escribir el código' }));
    tick();
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.input(dialog.getByLabelText('Código'), { target: { value: '123456' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Confirmar correo' }));

    await vi.waitFor(() => {
      tick();
      expect(host.changed()).toBe('ana@nuevo.pe');
    });
    expect(page.queryByText(/Falta confirmar/)).toBeNull();
  });
});
