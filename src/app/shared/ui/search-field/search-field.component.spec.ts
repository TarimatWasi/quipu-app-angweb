import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { within } from '@testing-library/dom';
import { SearchFieldComponent } from './search-field.component';

@Component({
  imports: [SearchFieldComponent],
  template: `
    <app-search-field
      fieldId="dp-guest"
      label="Huésped"
      controls="options"
      describedBy="help"
      [onPage]="false"
      [required]="true"
      [invalid]="invalid()"
      [(value)]="value"
    />
  `,
})
class HostComponent {
  readonly value = signal('Ana');
  readonly invalid = signal(true);
}

describe('SearchFieldComponent', () => {
  it('labels the field and says what it controls, whether it is required and invalid', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const input = within(fixture.nativeElement as HTMLElement).getByRole<HTMLInputElement>(
      'searchbox',
      { name: 'Huésped' },
    );
    expect(input.value).toBe('Ana');
    expect(input.getAttribute('aria-controls')).toBe('options');
    expect(input.getAttribute('aria-describedby')).toBe('help');
    expect(input.getAttribute('aria-required')).toBe('true');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.classList).not.toContain('quipu-input--filter');

    fixture.componentInstance.invalid.set(false);
    await fixture.whenStable();
    expect(input.getAttribute('aria-invalid')).toBeNull();
  });
});
