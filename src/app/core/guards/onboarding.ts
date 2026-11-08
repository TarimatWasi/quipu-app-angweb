import { RedirectCommand, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import type { OnboardingStepName, Session } from '@core/auth/auth.service';
import { noAccess } from './no-access';

/** The page of each step of the registration (O1 to O3); the password has its own page (A0.1). */
export const ONBOARDING_PATHS: Readonly<Record<Exclude<OnboardingStepName, 'PASSWORD'>, string>> = {
  PERSONAL_DATA: '/onboarding/personal-data',
  DOCUMENTS: '/onboarding/documents',
  CONSENT: '/onboarding/consent',
};

/** Whether `url` is `path` itself, something under it, or has a query or fragment on it. */
function isAt(url: string, path: string): boolean {
  return url === path || ['/', '?', '#'].some((mark) => url.startsWith(`${path}${mark}`));
}

/** Whether the session is a guest that has not finished its registration (RN-33). */
export function isRegistering(session: Session | null): boolean {
  return session?.role === 'GUEST' && session.guestStatus === 'ONBOARDING';
}

/**
 * Where a guest in onboarding must be (TAR-141, RN-33): only the page of the step it has to do next;
 * every other screen sends it there. The password step has the page that forces the change (A0.1),
 * and a guest whose next step is unknown starts at the personal data. Null: it is not registering,
 * or it already is where it must be.
 */
export function registrationTarget(session: Session | null, url: string): string | null {
  if (session === null || !isRegistering(session)) return null;
  const step = session.nextOnboardingStep;
  const target =
    step === undefined || step === 'PASSWORD'
      ? ONBOARDING_PATHS.PERSONAL_DATA
      : ONBOARDING_PATHS[step];
  return isAt(url, target) ? null : target;
}

/**
 * The pages of the registration are only for a guest that is registering: the administrator sees
 * «Sin acceso» (A0.7) and an active guest goes home.
 */
export function outsideRegistration(
  session: Session | null,
  router: Router,
  state: RouterStateSnapshot,
): UrlTree | RedirectCommand {
  return session?.role === 'ADMIN' ? noAccess(router, state) : router.createUrlTree(['/home']);
}
