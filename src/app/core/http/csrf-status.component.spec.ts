import { Component } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { fireEvent, render, screen } from '@testing-library/angular';
import { CsrfBootstrapService } from './csrf-bootstrap.service';
import { CsrfStatusComponent } from './csrf-status.component';

@Component({
  imports: [CsrfStatusComponent],
  template: '<app-csrf-status /><input aria-label="Draft" value="Unsent draft" />',
})
class HostComponent {}

describe('CSRF recovery status', () => {
  it('keeps the draft and focus, shares a busy recovery, and never submits a mutation', async () => {
    const { fixture } = await render(HostComponent, {
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const csrf = TestBed.inject(CsrfBootstrapService);
    const backend = TestBed.inject(HttpTestingController);
    const draft = screen.getByLabelText<HTMLInputElement>('Draft');
    draft.focus();
    csrf.invalidate();
    fixture.detectChanges();
    expect(document.activeElement).toBe(draft);
    fireEvent.click(screen.getByRole('button', { name: 'Preparar seguridad' }));
    fixture.detectChanges();
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Preparando…' }).disabled).toBe(
      true,
    );
    backend.expectOne('/bff/auth/csrf').flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();
    expect(screen.queryByRole('button', { name: 'Preparar seguridad' })).toBeNull();
    expect(draft.value).toBe('Unsent draft');
    backend.expectNone((request) => request.method !== 'GET');
    backend.verify();
  });
});
