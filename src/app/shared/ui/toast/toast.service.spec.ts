import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  it('shows the last toast with its tone, dismisses it and runs its action once', () => {
    const toasts = TestBed.inject(ToastService);
    expect(toasts.current()).toBeNull();

    toasts.show('Pago registrado.', { tone: 'success' });
    expect(toasts.current()).toEqual({
      text: 'Pago registrado.',
      tone: 'success',
      actionLabel: null,
      action: null,
    });

    const retry = vi.fn();
    toasts.show('No se pudo guardar.', { actionLabel: 'Reintentar', action: retry });
    expect(toasts.current()?.text).toBe('No se pudo guardar.');
    expect(toasts.current()?.tone).toBeNull();

    toasts.act();
    expect(retry).toHaveBeenCalledTimes(1);
    expect(toasts.current()).toBeNull();

    toasts.show('Otro aviso.');
    toasts.dismiss();
    expect(toasts.current()).toBeNull();
    toasts.act();
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
