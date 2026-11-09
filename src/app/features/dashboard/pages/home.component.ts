import { Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { AdminHomeComponent } from './admin-home.component';

/**
 * `/home` of every role: the administrator sees A1; a guest sees its own page (H1 «Estado de
 * cuenta», T1 «Estado de pago»), which my-account gives as the child route of the outlet. The
 * guest's page has its own title and day, so the home adds nothing around it.
 */
@Component({
  selector: 'app-home',
  imports: [AdminHomeComponent, RouterOutlet],
  template: `
    @if (isAdmin()) {
      <app-admin-home />
    } @else {
      <router-outlet />
    }
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class HomeComponent {
  private readonly session = inject(AuthService).session;

  protected readonly isAdmin = computed(() => this.session()?.role === 'ADMIN');
}
