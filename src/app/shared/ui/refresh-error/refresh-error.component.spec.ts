import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { fireEvent, within } from '@testing-library/dom';
import { RefreshErrorComponent } from './refresh-error.component';

@Component({
  imports: [RefreshErrorComponent],
  template: `<app-refresh-error
    [message]="message()"
    [refreshing]="refreshing()"
    [progress]="progress()"
    (retry)="retried.set(retried() + 1)"
  />`,
})
class HostComponent {
  readonly message = signal<string | null>(null);
  readonly refreshing = signal(false);
  readonly progress = signal(false);
  readonly retried = signal(0);
}

describe('RefreshErrorComponent (TAR-322)', () => {
  function setup() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const settle = () => {
      fixture.detectChanges();
    };
    return { fixture, host: fixture.componentInstance, root, settle };
  }

  it('draws nothing while the refresh has not failed and nobody asked for «Actualizando…»', () => {
    const { root, host, settle } = setup();
    host.refreshing.set(true);
    settle();

    expect(root.querySelector('app-refresh-error')?.textContent.trim()).toBe('');
  });

  it('says «Actualizando…» while it refreshes, only when the screen asks for it', () => {
    const { root, host, settle } = setup();
    host.refreshing.set(true);
    host.progress.set(true);
    settle();

    expect(within(root).getByText('Actualizando…')).toBeTruthy();
  });

  it('shows the load error with «Reintentar», which reports the retry and says «Cargando…» meanwhile', () => {
    const { root, host, settle } = setup();
    host.message.set('No se pudo cargar el huésped.');
    settle();

    expect(within(root).getByText('No se pudo cargar el huésped.')).toBeTruthy();
    fireEvent.click(within(root).getByRole('button', { name: 'Reintentar' }));
    expect(host.retried()).toBe(1);

    host.refreshing.set(true);
    settle();
    expect(within(root).getByRole('button', { name: 'Cargando…' }).hasAttribute('disabled')).toBe(
      true,
    );
  });
});
