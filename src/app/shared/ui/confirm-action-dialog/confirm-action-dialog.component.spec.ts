import { HttpErrorResponse } from '@angular/common/http';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { fireEvent, within } from '@testing-library/dom';
import { Observable, of, throwError } from 'rxjs';
import { openConfirmActionDialog } from './confirm-action-dialog.component';
import type { ConfirmActionData } from './confirm-action-dialog.component';

const base = (run: () => Observable<unknown>): ConfirmActionData => ({
  title: 'Finalizar contrato',
  points: ['Libera el ambiente.', 'No borra lo que se debe.'],
  button: 'Finalizar',
  pendingButton: 'Finalizando…',
  run,
  failureText: () => 'No se pudo finalizar.',
});

describe('ConfirmActionDialogComponent (TAR-323)', () => {
  function open(data: ConfirmActionData) {
    const ref = openConfirmActionDialog(TestBed.inject(MatDialog), data);
    const closed = vi.fn();
    ref.afterClosed().subscribe(closed);
    const tick = () => {
      TestBed.inject(ApplicationRef).tick();
    };
    tick();
    return { ref, closed, tick, ui: within(document.body) };
  }

  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
  });

  it('says what changes, with the button that does it and «Cancelar»', () => {
    const { ui } = open({ ...base(() => of(null)), text: 'No se puede deshacer.' });

    expect(ui.getByRole('heading', { name: 'Finalizar contrato' })).toBeTruthy();
    expect(ui.getByText('Libera el ambiente.')).toBeTruthy();
    expect(ui.getByText('No se puede deshacer.')).toBeTruthy();
    expect(ui.getByRole('button', { name: 'Cancelar' })).toBeTruthy();
    expect(ui.getByRole('button', { name: 'Finalizar' })).toBeTruthy();
  });

  it('shows what the action is about in bold with its detail', () => {
    const { ui } = open({
      ...base(() => of(null)),
      points: undefined,
      lead: { what: 'Reparación del caño', detail: 'Mantenimiento · S/ 320.00' },
    });

    expect(ui.getByText('Reparación del caño').tagName).toBe('STRONG');
    expect(ui.getByText('Mantenimiento · S/ 320.00')).toBeTruthy();
  });

  it('runs the action and answers true when it is done', async () => {
    const run = vi.fn(() => of(null));
    const { ui, closed } = open(base(run));

    fireEvent.click(ui.getByRole('button', { name: 'Finalizar' }));
    await vi.waitFor(() => {
      expect(closed).toHaveBeenCalledWith(true);
    });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('keeps the dialog open and says the failure in red', async () => {
    const { ui, closed, tick } = open(
      base(() => throwError(() => new HttpErrorResponse({ status: 500 }))),
    );

    fireEvent.click(ui.getByRole('button', { name: 'Finalizar' }));

    await vi.waitFor(() => {
      tick();
      expect(ui.getByRole('alert').textContent).toBe('No se pudo finalizar.');
    });
    expect(closed).not.toHaveBeenCalled();
  });

  it('only goes away on a 401, which is the session interceptor’s', async () => {
    const { ui, closed } = open(
      base(() => throwError(() => new HttpErrorResponse({ status: 401 }))),
    );

    fireEvent.click(ui.getByRole('button', { name: 'Finalizar' }));

    await vi.waitFor(() => {
      expect(closed).toHaveBeenCalledWith(undefined);
    });
    expect(ui.queryByRole('alert')).toBeNull();
  });
});
