import { fireEvent, render, screen } from '@testing-library/angular';
import { CheckFieldComponent } from './check-field.component';

describe('CheckFieldComponent', () => {
  it('names the box by its sentence, ties the help to it and reports what the person marks', async () => {
    const { fixture } = await render(CheckFieldComponent, {
      inputs: { fieldId: 'consent', label: 'Acepto', help: 'Se guarda la fecha.' },
    });

    const box = screen.getByRole<HTMLInputElement>('checkbox', { name: 'Acepto' });
    expect(box.getAttribute('aria-describedby')).toBe('consent-help');
    expect(box.getAttribute('aria-invalid')).toBeNull();

    fireEvent.click(box);
    expect(fixture.componentInstance.checked()).toBe(true);
    fireEvent.click(box);
    expect(fixture.componentInstance.checked()).toBe(false);
  });

  it('shows the error, ties it to the box and marks it invalid', async () => {
    await render(CheckFieldComponent, {
      inputs: {
        fieldId: 'consent',
        label: 'Acepto',
        help: 'Se guarda la fecha.',
        error: 'Debes marcar la casilla',
      },
    });

    const box = screen.getByRole('checkbox', { name: 'Acepto' });
    expect(box.getAttribute('aria-invalid')).toBe('true');
    expect(box.getAttribute('aria-describedby')).toBe('consent-error');
    expect(screen.getByText('Debes marcar la casilla')).toBeTruthy();
  });
});
