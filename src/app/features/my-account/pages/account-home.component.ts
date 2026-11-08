import { Component, computed, inject } from '@angular/core';
import { AuthService } from '@core/auth/auth.service';
import { GuestHomeComponent } from './guest-home.component';
import { TemporaryHomeComponent } from './temporary-home.component';

/**
 * The guest's home (H1 «Estado de cuenta» for a guest with a contract, T1 «Estado de pago» for a
 * temporary one), shown in the outlet of the home of dashboard. The administrator, and a guest of
 * no known kind, get nothing.
 */
@Component({
  selector: 'app-account-home',
  imports: [GuestHomeComponent, TemporaryHomeComponent],
  template: `
    @if (guestType() === 'CONTRACT') {
      <app-guest-home />
    } @else if (guestType() === 'TEMPORARY') {
      <app-temporary-home />
    }
  `,
  // No box of its own: the page sits in the home as the home's own child.
  styles: `
    :host {
      display: contents;
    }
  `,
})
export class AccountHomeComponent {
  private readonly session = inject(AuthService).session;

  protected readonly guestType = computed(() => {
    const current = this.session();
    return current?.role === 'ADMIN' ? undefined : current?.guestType;
  });
}
