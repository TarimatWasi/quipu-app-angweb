import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, FormRoot, submit } from '@angular/forms/signals';
import { fireEvent, within } from '@testing-library/dom';
import { NewPasswordFieldComponent } from './new-password-field.component';
import { newPasswordRules } from './new-password-rules';

@Component({
  imports: [FormRoot, NewPasswordFieldComponent],
  template: `
    <form [formRoot]="passwordForm" novalidate>
      <app-new-password-field [field]="passwordForm.newPassword" label="Contraseña" inputId="pw" />
    </form>
  `,
})
class HostComponent {
  readonly passwordForm = form(signal({ newPassword: '' }), (path) => {
    newPasswordRules(path.newPassword);
  });
}

async function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  return { fixture, ui: within(fixture.nativeElement as HTMLElement) };
}

describe('NewPasswordFieldComponent (P-07, A0.1/A0.2/A0.5)', () => {
  it('labels the field and links the help with aria-describedby', async () => {
    const { ui } = await setup();
    const field = ui.getByLabelText('Contraseña');

    expect(field.getAttribute('type')).toBe('password');
    expect(field.getAttribute('aria-describedby')).toBe('pw-help');
    expect(ui.getByText('Mínimo 8 caracteres.').id).toBe('pw-help');
  });

  it('shows and hides the password with «Mostrar» / «Ocultar»', async () => {
    const { ui } = await setup();
    const field = ui.getByLabelText('Contraseña');

    fireEvent.click(ui.getByRole('button', { name: 'Mostrar' }));
    await vi.waitFor(() => {
      expect(field.getAttribute('type')).toBe('text');
    });
    const hide = ui.getByRole('button', { name: 'Ocultar' });
    expect(hide.getAttribute('aria-pressed')).toBe('true');
    expect(hide.getAttribute('aria-controls')).toBe('pw');
  });

  it('shows the error of the rules under the field once the form is submitted', async () => {
    const { fixture, ui } = await setup();

    await submit(fixture.componentInstance.passwordForm, () => Promise.resolve(undefined));
    await fixture.whenStable();

    const field = ui.getByLabelText('Contraseña');
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(field.getAttribute('aria-describedby')).toBe('pw-error pw-help');
    expect(ui.getByText('Ingresa tu nueva contraseña').id).toBe('pw-error');
  });
});
