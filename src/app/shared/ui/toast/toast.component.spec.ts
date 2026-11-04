import { render, screen } from '@testing-library/angular';
import { ToastComponent } from './toast.component';

describe('ToastComponent (P-17)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is an <output> that stays in the page (never display:none), empty while there is no message', async () => {
    const { container } = await render(ToastComponent);

    const output = container.querySelector('output');
    expect(output).toBeTruthy();
    expect(output?.querySelector('.box')).toBeNull();
    expect(output && getComputedStyle(output).display).not.toBe('none');
    expect(output?.textContent.trim()).toBe('');
  });

  it('without an action asks to go away after 5 s, not before', async () => {
    const dismissed = vi.fn<() => void>();
    const { fixture, container } = await render(ToastComponent, {
      inputs: { message: 'Pago aprobado.' },
      on: { dismissed },
    });

    const output = container.querySelector('output');
    expect(screen.getByText('Pago aprobado.').closest('.box')?.parentElement).toBe(output);
    vi.advanceTimersByTime(4_999);
    expect(dismissed).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    fixture.detectChanges();
    expect(dismissed).toHaveBeenCalledTimes(1);
  });

  it('a new message starts the 5 s again', async () => {
    const dismissed = vi.fn<() => void>();
    const { fixture } = await render(ToastComponent, {
      inputs: { message: 'Uno.' },
      on: { dismissed },
    });

    vi.advanceTimersByTime(4_000);
    fixture.componentRef.setInput('message', 'Dos.');
    fixture.detectChanges();
    expect(screen.getByText('Dos.')).toBeTruthy();
    vi.advanceTimersByTime(4_000);
    expect(dismissed).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1_000);
    expect(dismissed).toHaveBeenCalledTimes(1);
  });

  it('with an action stays until it is used', async () => {
    const dismissed = vi.fn<() => void>();
    const action = vi.fn<() => void>();
    await render(ToastComponent, {
      inputs: { message: 'No se pudo guardar.', actionLabel: 'Reintentar' },
      on: { dismissed, action },
    });

    vi.advanceTimersByTime(10_000);
    expect(dismissed).not.toHaveBeenCalled();
    screen.getByRole('button', { name: 'Reintentar' }).click();
    expect(action).toHaveBeenCalledTimes(1);
  });
});
