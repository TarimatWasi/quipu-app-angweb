import { Component, signal } from '@angular/core';
import { fireEvent, render, screen } from '@testing-library/angular';
import { ProofAmountFieldComponent } from './proof-amount-field.component';
import { ProofKindChoiceComponent } from './proof-kind-choice.component';
import { ProofMethodFieldComponent } from './proof-method-field.component';
import type { ProofDraft } from './proof-fields';

@Component({
  imports: [ProofAmountFieldComponent, ProofKindChoiceComponent, ProofMethodFieldComponent],
  template: `
    <app-proof-kind-choice
      label="Tipo del comprobante"
      [kind]="kind()"
      (kindChange)="kind.set($event)"
    />
    <app-proof-amount-field
      fieldId="amount"
      label="Monto recibido"
      [value]="amount()"
      [error]="error()"
      help="Monto en soles"
      (valueChange)="amount.set($event)"
    />
    <app-proof-method-field
      fieldId="method"
      [value]="method()"
      (valueChange)="method.set($event)"
    />
  `,
})
class HostComponent {
  readonly kind = signal<ProofDraft['kind']>('VOUCHER');
  readonly amount = signal('');
  readonly method = signal('');
  readonly error = signal<string | null>(null);
}

describe('Composed proof editor controls', () => {
  it('keeps an unparsed amount while typing and associates the local error and help with its input', async () => {
    const { fixture } = await render(HostComponent);
    const field = screen.getByLabelText('Monto recibido');
    fireEvent.input(field, { target: { value: '12,' } });
    fixture.detectChanges();
    expect(fixture.componentInstance.amount()).toBe('12,');
    expect(field.getAttribute('inputmode')).toBe('decimal');
    fixture.componentInstance.error.set('Revisa el monto');
    fixture.detectChanges();
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(field.getAttribute('aria-describedby')).toBe('amount-error amount-help');
    expect(document.getElementById('amount-error')?.textContent).toContain('Revisa el monto');
  });

  it('emits the chosen kind and keeps a single pressed option in the named group', async () => {
    const { fixture } = await render(HostComponent);
    fireEvent.click(screen.getByRole('button', { name: 'Efectivo, sin voucher' }));
    fixture.detectChanges();
    expect(fixture.componentInstance.kind()).toBe('CASH');
    expect(screen.getByRole('group', { name: 'Tipo del comprobante' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Con voucher' }).getAttribute('aria-pressed')).toBe(
      'false',
    );
    expect(
      screen.getByRole('button', { name: 'Efectivo, sin voucher' }).getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('uses the same output for typing a method and choosing a shortcut', async () => {
    const { fixture } = await render(HostComponent);
    const field = screen.getByLabelText('Medio de pago (opcional)');
    fireEvent.input(field, { target: { value: 'Otro medio' } });
    fixture.detectChanges();
    expect(fixture.componentInstance.method()).toBe('Otro medio');
    fireEvent.click(screen.getByRole('button', { name: 'Yape' }));
    fixture.detectChanges();
    expect(fixture.componentInstance.method()).toBe('Yape');
    expect((field as HTMLInputElement).value).toBe('Yape');
    expect(field.getAttribute('maxlength')).toBe('60');
    expect(screen.getByRole('button', { name: 'Yape' }).getAttribute('aria-pressed')).toBe('true');
  });
});
