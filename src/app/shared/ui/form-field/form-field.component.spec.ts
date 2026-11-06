import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { within } from '@testing-library/dom';
import { FieldControlDirective } from './field-control.directive';
import { FormFieldComponent } from './form-field.component';

@Component({
  imports: [FieldControlDirective, FormFieldComponent],
  template: `
    <app-form-field
      fieldId="phone"
      label="Teléfono"
      [help]="help()"
      [error]="error()"
      [optional]="true"
    >
      <input appFieldControl class="quipu-input" type="tel" />
      <a fieldAfter href="/help">Ayuda</a>
    </app-form-field>
    <app-form-field fieldId="amount" label="Monto recibido" [money]="true">
      <input appFieldControl class="quipu-input" inputmode="decimal" />
    </app-form-field>
    <app-form-field fieldId="type" label="Tipo de huésped" help="Define cómo paga." [group]="true">
      <div class="quipu-segmented" appFieldControl>
        <button type="button" aria-pressed="true">Con contrato</button>
      </div>
    </app-form-field>
  `,
})
class HostComponent {
  readonly help = signal<string | null>('Le escribimos si hace falta.');
  readonly error = signal<string | null>(null);
}

async function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  return {
    fixture,
    host: fixture.componentInstance,
    ui: within(fixture.nativeElement as HTMLElement),
  };
}

describe('FormFieldComponent (P-07)', () => {
  it('names the control by its label, says it is optional and describes it by its help', async () => {
    const { ui } = await setup();
    const phone = ui.getByLabelText(/Teléfono/);
    expect(phone.id).toBe('phone');
    expect(ui.getByText('(opcional)')).toBeTruthy();
    expect(phone.getAttribute('aria-describedby')).toBe('phone-help');
    expect(phone.getAttribute('aria-invalid')).toBeNull();
    expect(document.getElementById('phone-help')?.textContent).toBe('Le escribimos si hace falta.');
  });

  it('marks the control invalid and describes it by its error first, then its help', async () => {
    const { ui, host, fixture } = await setup();
    host.error.set('Revisa el número');
    await fixture.whenStable();
    const phone = ui.getByLabelText(/Teléfono/);
    expect(phone.getAttribute('aria-invalid')).toBe('true');
    expect(phone.getAttribute('aria-describedby')).toBe('phone-error phone-help');
    expect(ui.getByText('Revisa el número').classList).toContain('quipu-field-error');

    host.help.set(null);
    await fixture.whenStable();
    expect(phone.getAttribute('aria-describedby')).toBe('phone-error');
  });

  it('keeps a projected action after validation messages', async () => {
    const { ui, host, fixture } = await setup();
    host.error.set('Revisa el número');
    await fixture.whenStable();
    const error = ui.getByText('Revisa el número');
    const action = ui.getByRole('link', { name: 'Ayuda' });
    expect(error.compareDocumentPosition(action) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('puts «S/» before an amount, hidden from a screen reader', async () => {
    const { ui } = await setup();
    const amount = ui.getByLabelText('Monto recibido');
    const money = amount.closest('.quipu-money');
    expect(money?.querySelector('[aria-hidden="true"]')?.textContent).toBe('S/');
    expect(amount.getAttribute('aria-describedby')).toBeNull();
  });

  it('names a group of buttons by its legend, without giving them the id of a control', async () => {
    const { ui } = await setup();
    const group = ui.getByRole('group', { name: 'Tipo de huésped' });
    expect(group.tagName).toBe('FIELDSET');
    const buttons = group.querySelector('.quipu-segmented');
    expect(buttons?.getAttribute('id')).toBeNull();
    expect(buttons?.getAttribute('aria-describedby')).toBe('type-help');
  });
});
