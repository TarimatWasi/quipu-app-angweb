import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService, Role } from '@core/auth/auth.service';
import { QuipuComponent } from '@shared/quipu/quipu.component';

const ROLE_LABELS: Readonly<Record<Role, string>> = {
  ADMIN: 'Administrador',
  GUEST: 'Huésped',
};

@Component({
  selector: 'app-home',
  imports: [QuipuComponent, RouterLink, RouterOutlet],
  template: `
    <div class="home">
      <div>
        <h1>Inicio</h1>
        @if (session(); as current) {
          <p class="who">
            Sesión iniciada como <strong>{{ current.name }}</strong
            >, rol <strong>{{ roleLabel() }}</strong
            >.
          </p>
          @if (current.role === 'ADMIN') {
            <nav class="shortcuts" aria-label="Administración">
              <a class="card" routerLink="/admin/payments">
                <span class="card-title">Pagos</span>
                <span class="card-text">Revisa los pagos enviados y corrige los rechazados.</span>
              </a>
            </nav>
          } @else {
            <!-- The guest's panels (H1, T1) come from my-account as a child route. -->
            <router-outlet />
          }
        }
      </div>
      <app-quipu class="quipu" />
    </div>
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
    .shortcuts {
      margin-top: 2rem;
    }
    .card {
      display: grid;
      gap: 0.25rem;
      max-width: 24rem;
      padding: 1rem 1.25rem;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: var(--quipu-radio);
      background: var(--quipu-alpaca);
      color: var(--mat-sys-on-surface);
      text-decoration: none;
    }
    .card:hover {
      border-color: var(--mat-sys-primary);
    }
    .card-title {
      color: var(--mat-sys-primary);
      font-size: 1.25rem;
    }
    .card-text {
      font-weight: 400;
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
  protected readonly roleLabel = computed(() => {
    const current = this.session();
    return current ? ROLE_LABELS[current.role] : '';
  });
}
