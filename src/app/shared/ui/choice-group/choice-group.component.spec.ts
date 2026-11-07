import { render, screen } from '@testing-library/angular';
import { ChoiceGroupComponent } from './choice-group.component';

const OPTIONS = [
  { value: 'EMAIL', label: 'Correo' },
  { value: 'IN_PERSON', label: 'En persona' },
];

describe('ChoiceGroupComponent', () => {
  it('presses the chosen option and only that one', async () => {
    await render(ChoiceGroupComponent, { inputs: { options: OPTIONS, value: 'IN_PERSON' } });

    expect(screen.getByRole('button', { name: 'Correo' }).getAttribute('aria-pressed')).toBe(
      'false',
    );
    expect(screen.getByRole('button', { name: 'En persona' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('presses none while nothing is chosen, and says which one was pressed', async () => {
    const valueChange = vi.fn<(value: string) => void>();
    await render(ChoiceGroupComponent, {
      inputs: { options: OPTIONS },
      on: { valueChange },
    });

    for (const button of screen.getAllByRole('button')) {
      expect(button.getAttribute('aria-pressed')).toBe('false');
    }
    screen.getByRole('button', { name: 'Correo' }).click();
    expect(valueChange).toHaveBeenCalledWith('EMAIL');
  });

  it('does not answer while it is disabled', async () => {
    const valueChange = vi.fn<(value: string) => void>();
    await render(ChoiceGroupComponent, {
      inputs: { options: OPTIONS, disabled: true },
      on: { valueChange },
    });

    screen.getByRole('button', { name: 'Correo' }).click();
    expect(valueChange).not.toHaveBeenCalled();
  });
});
