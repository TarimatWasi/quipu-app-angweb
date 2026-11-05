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
// The temporary guest has no contract: its account is the payment status and its data.
const TEMPORARY_NO_ACCESS_TEXT = 'Desde tu cuenta puedes ver tu estado de pago y tus datos.';

function noAccessTextFor(session: Session | null): string {
  if (session?.role !== 'GUEST') return NOT_FOUND_TEXT;
  return session.guestType === 'TEMPORARY' ? TEMPORARY_NO_ACCESS_TEXT : GUEST_NO_ACCESS_TEXT;
}

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
      text: noAccessTextFor(session),
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
  if (session.role === 'ADMIN') return { label: 'Ir al inicio', link: '/home' };
  return session.guestType === 'TEMPORARY'
    ? { label: 'Ir a mi estado de pago', link: '/home' }
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
    /* The canvas: 120 px above and below on a wide screen, 48 px on a phone, counted from the
       bar; the shell's main already gives part of it (and the 48 or 16 px of the sides). */
    :host {
      display: block;
      max-width: var(--quipu-pagina-mensaje-ancho);
      padding-block: calc(
        var(--quipu-pagina-mensaje-relleno) - var(--quipu-contenido-relleno-bloque)
      );
    }
    h1 {
      margin: var(--quipu-espacio-antetitulo) 0 0;
    }
    .text {
      max-width: var(--quipu-texto-medida);
      margin: 1rem 0 0;
      font-size: var(--mat-sys-title-medium-size);
      line-height: var(--mat-sys-body-large-line-height);
      color: var(--quipu-tinta-secundaria);
    }
    .action {
      display: flex;
      width: fit-content;
      margin-top: 1.75rem;
    }
    @media (max-width: 599.98px) {
      :host {
        padding-block: calc(
          var(--quipu-pagina-mensaje-relleno-movil) - var(--quipu-contenido-relleno-bloque)
        );
      }
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
