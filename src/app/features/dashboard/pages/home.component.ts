import { Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService, Role } from '@core/auth/auth.service';
import { QuipuComponent } from '@shared/quipu/quipu.component';
import { AdminHomeComponent } from './admin-home.component';

const ROLE_LABELS: Readonly<Record<Role, string>> = {
  ADMIN: 'Administrador',
  GUEST: 'Huésped',
};

/**
 * `/home` of every role: the administrator sees A1; a guest sees the greeting with the panels of
 * its account (H1, T1), which my-account gives as the child route of the outlet.
 */
@Component({
  selector: 'app-home',
  imports: [AdminHomeComponent, QuipuComponent, RouterOutlet],
  template: `
    @if (isAdmin()) {
      <app-admin-home />
    } @else {
      <div class="home">
        <div>
          <h1>Inicio</h1>
          @if (session(); as current) {
            <p class="who">
              Sesión iniciada como <strong>{{ current.name }}</strong
              >, rol <strong>{{ roleLabel() }}</strong
              >.
            </p>
            <!-- The guest's panels (H1, T1) come from my-account as a child route. -->
            <router-outlet />
          }
        </div>
        <app-quipu class="quipu" />
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .home {
      display: grid;
      grid-template-columns: 1fr minmax(16rem, 26rem);
      gap: clamp(2rem, 6vw, 6rem);
      align-items: start;
    }
    h1 {
      font-size: clamp(2.5rem, 5vw, 4rem);
    }
    .who {
      margin: 0;
      max-width: 40ch;
      font-size: 1.25rem;
    }
    .quipu {
      --quipu-cord: var(--quipu-obsidiana);
      --quipu-green: var(--mat-sys-primary);
    }
    @media (max-width: 47.5rem) {
      .home {
        grid-template-columns: 1fr;
      }
      .quipu {
        max-width: 20rem;
      }
    }
  `,
})
export class HomeComponent {
  private readonly auth = inject(AuthService);

  protected readonly session = this.auth.session;
  protected readonly isAdmin = computed(() => this.session()?.role === 'ADMIN');
  protected readonly roleLabel = computed(() => {
    const current = this.session();
    return current ? ROLE_LABELS[current.role] : '';
  });
}
