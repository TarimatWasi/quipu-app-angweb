import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { isRegistering, outsideRegistration, registrationTarget } from './onboarding';

/**
 * A guest in onboarding only reaches the page of the step it has to do next (TAR-141, RN-33): every
 * other screen sends it there, and so does a step ahead or behind its own. It is a guard of the
 * children of the shell, not of the shell: a `canActivate` on a parent runs once, when it is
 * entered, and Angular does not run it again when the guest moves between its children.
 */
export const registrationGuard: CanActivateChildFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.restored();
  const target = registrationTarget(auth.session(), state.url);
  return target === null ? true : router.createUrlTree([target]);
};

/**
 * O1 to O3: the registration is for a guest that has not finished it. Which of its steps the guest
 * may open is `registrationGuard`'s, which runs first and sends it to the one it has to do next.
 */
export const onboardingGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.restored();
  const session = auth.session();
  return isRegistering(session) || outsideRegistration(session, router, state);
};
