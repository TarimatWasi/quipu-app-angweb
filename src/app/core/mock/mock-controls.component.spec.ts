import { HttpParams } from '@angular/common/http';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { render, screen, fireEvent } from '@testing-library/angular';
import { MockControlsComponent } from './mock-controls.component';
import { MockBff } from './mock-bff';
import { MockRequestControls } from './mock-request-controls';
import { resetMockSettings } from './mock-bff.testing';
import { readMockSetting } from './mock-storage';

function choose(label: string, value: string): void {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe('MockControlsComponent', () => {
  beforeEach(() => {
    resetMockSettings();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    resetMockSettings();
  });

  it('arms the selected next error and clears controls without reloading or changing data', async () => {
    const reload = vi.fn();
    await render(MockControlsComponent, { on: { reloadRequested: reload } });
    fireEvent.click(screen.getByText('Inspección interactiva'));
    const db = TestBed.inject(MockBff).db;
    choose('Error para armar o liberar una petición', 'conflict');
    choose('Guardar / resolver pagos', 'fail-next');
    const controls = TestBed.inject(MockRequestControls);
    expect(controls.rules()['payment-write']).toEqual({ mode: 'fail-next', failure: 'conflict' });
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar controles y cancelar esperas' }));
    expect(controls.rules()).toEqual({});
    expect(TestBed.inject(MockBff).db).toBe(db);
    expect(reload).not.toHaveBeenCalled();
  });

  it('exposes a release action for each held request and removes canceled entries', async () => {
    await render(MockControlsComponent);
    fireEvent.click(screen.getByText('Inspección interactiva'));
    choose('Resumen de pagos', 'hold');
    const controls = TestBed.inject(MockRequestControls);
    const subscription = controls
      .dispatch(
        { method: 'GET', path: '/bff/admin/dashboard', query: new HttpParams(), body: null },
        () => Promise.resolve({ status: 200, body: {} }),
        0,
      )
      .subscribe();
    await TestBed.inject(ApplicationRef).whenStable();
    const id = controls.pending()[0]?.id ?? 0;
    expect(screen.getByRole('button', { name: `Liberar #${String(id)}` })).toBeTruthy();
    expect(screen.getByRole('button', { name: `Error #${String(id)}` })).toBeTruthy();
    subscription.unsubscribe();
    await TestBed.inject(ApplicationRef).whenStable();
    expect(screen.queryByRole('button', { name: `Liberar #${String(id)}` })).toBeNull();
  });

  it('changes fixture only on explicit apply and restores it on reset', async () => {
    const reload = vi.fn();
    await render(MockControlsComponent, { on: { reloadRequested: reload } });
    fireEvent.click(screen.getByText('Inspección interactiva'));
    const bff = TestBed.inject(MockBff);
    choose('Muestra de datos', 'many');
    expect(bff.presentationPreset()).toBe('standard');
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar datos y recargar' }));
    expect(bff.presentationPreset()).toBe('many');
    expect(readMockSetting('quipu-mock:presentation')).toBe('many');
    expect(reload).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Restablecer datos y recargar' }));
    expect(bff.presentationPreset()).toBe('standard');
    expect(bff.scenario()).toBe('normal');
  });

  it('keeps fixtures in memory and avoids destructive reload when storage is blocked', async () => {
    const reload = vi.fn();
    await render(MockControlsComponent, { on: { reloadRequested: reload } });
    fireEvent.click(screen.getByText('Inspección interactiva'));
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    choose('Muestra de datos', 'long');
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar datos y recargar' }));
    await TestBed.inject(ApplicationRef).whenStable();
    expect(TestBed.inject(MockBff).presentationPreset()).toBe('long');
    expect(screen.getByText(/Datos reiniciados en memoria/)).toBeTruthy();
    expect(reload).not.toHaveBeenCalled();
  });
});
