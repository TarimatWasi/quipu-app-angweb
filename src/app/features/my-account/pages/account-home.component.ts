import { Component, computed, inject } from '@angular/core';
import { AuthService } from '@core/auth/auth.service';
import { GuestHomePanelComponent } from './guest-home-panel.component';
import { TemporaryHomePanelComponent } from './temporary-home-panel.component';

/**
 * The guest's part of the home (H1 for a guest with a contract, T1 for a temporary one), shown in
 * the outlet of the home of dashboard. The administrator, and a guest of no known kind, get nothing.
 */
@Component({
  selector: 'app-account-home',
  imports: [GuestHomePanelComponent, TemporaryHomePanelComponent],
  template: `
    @if (guestType() === 'CONTRACT') {
      <app-guest-home-panel />
    } @else if (guestType() === 'TEMPORARY') {
      <app-temporary-home-panel />
    }
  `,
  // No box of its own: the panels sit in the home exactly as when the home rendered them itself.
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
