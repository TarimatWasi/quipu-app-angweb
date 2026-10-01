import { Component, computed, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { Router } from '@angular/router';
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
        @if (current.mustChangePassword) {
          <p role="status">
            Debes cambiar tu contraseña. El cambio de contraseña está pendiente de implementarse.
          </p>
        }
      }
      <button mat-stroked-button type="button" (click)="leave()">Salir</button>
      <p>
        <small
          >La sesión del servidor sigue activa hasta que expire (pendiente: cierre de sesión del
          servidor).</small
        >
      </p>
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

  /** The BFF has no logout yet: this only forgets the session in this tab (the cookie expires on its own). */
  protected leave(): void {
    this.auth.clear();
    void this.router.navigateByUrl('/login');
  }
}
