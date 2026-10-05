import { Component, computed, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService, Role } from '@core/services/auth.service';

const ROLE_LABELS: Readonly<Record<Role, string>> = {
  ADMIN: 'Administrador',
  GUEST: 'Huésped',
};

@Component({
  selector: 'app-home',
  imports: [MatButton],
  template: `
    <main>
      <h1>Quipu</h1>
      @if (session(); as current) {
        <p>
          Sesión iniciada como <strong>{{ current.name }}</strong
          >, rol <strong>{{ roleLabel() }}</strong
          >.
        </p>
      }
      <button mat-stroked-button type="button" (click)="leave()">Salir</button>
    </main>
  `,
  styles: `
    :host {
      display: block;
      padding: 1rem;
    }
  `,
})
export class HomeComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly session = this.auth.session;
  protected readonly roleLabel = computed(() => {
    const current = this.session();
    return current ? ROLE_LABELS[current.role] : '';
  });

  /** Closes the session in the BFF (it expires the cookie) and goes back to the login. */
  protected async leave(): Promise<void> {
    await firstValueFrom(this.auth.logout());
    await this.router.navigateByUrl('/login');
  }
}
