import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService, Session } from '@core/auth/auth.service';

/** Why the page is shown: the address does not exist, or it is not for the session's account. */
export type NotFoundReason = 'not-found' | 'no-access';

const NOT_FOUND_TEXT =
  'Puede que el enlace esté mal escrito o que la página ya no exista. Lo que buscas está en las secciones de arriba.';
// SEG-07: it says what the guest's own account has, never what is behind the address.
const GUEST_NO_ACCESS_TEXT =
  'Desde tu cuenta puedes ver tu estado de cuenta, tu contrato, tus pagos y tus datos.';

interface Texts {
  readonly eyebrow: string;
  readonly title: string;
  readonly text: string;
}

interface Action {
  readonly label: string;
  readonly link: string;
}

function textsFor(reason: NotFoundReason, session: Session | null): Texts {
  if (reason === 'no-access') {
    return {
      eyebrow: 'Sin acceso',
      title: 'Esta página no es para tu cuenta',
      text: session?.role === 'GUEST' ? GUEST_NO_ACCESS_TEXT : NOT_FOUND_TEXT,
    };
  }
  return {
    eyebrow: 'Página no encontrada',
    title: 'No encontramos esta página',
    text: NOT_FOUND_TEXT,
  };
}

function actionFor(session: Session | null): Action {
  if (!session) return { label: 'Ir a iniciar sesión', link: '/login' };
  return session.role === 'ADMIN'
    ? { label: 'Ir al inicio', link: '/home' }
    : { label: 'Ir a mi estado de cuenta', link: '/home' };
}

/**
 * A0.7 «Página no encontrada» and «Sin acceso»: inside the shell (P-01), with the menu of the role
 * and no section marked, or with only the brand for someone without a session. The route says the
 * reason in its data; the session says the text and where the button goes.
 */
@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <p class="quipu-eyebrow">{{ texts().eyebrow }}</p>
    <h1>{{ texts().title }}</h1>
    <p class="text">{{ texts().text }}</p>
    <a class="quipu-button quipu-button--primary action" [routerLink]="action().link">{{
      action().label
    }}</a>
  `,
  styles: `
    :host {
      display: block;
    }
    .text {
      max-width: var(--quipu-texto-medida);
      margin: 0 0 2rem;
      font-size: var(--quipu-texto-intro-size);
      color: var(--quipu-tinta-secundaria);
    }
    @media (max-width: 599.98px) {
      .action {
        width: 100%;
      }
    }
  `,
})
export class NotFoundComponent {
  private readonly session = inject(AuthService).session;
  private readonly reason: NotFoundReason =
    inject(ActivatedRoute).snapshot.data['reason'] === 'no-access' ? 'no-access' : 'not-found';

  protected readonly texts = computed(() => textsFor(this.reason, this.session()));
  protected readonly action = computed(() => actionFor(this.session()));
}
