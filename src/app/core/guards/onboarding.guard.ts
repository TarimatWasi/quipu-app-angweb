import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { isRegistering, outsideRegistration } from './onboarding';

/**
 * O1 to O3 (TAR-141): the registration is for a guest that has not finished it. Which of its steps
 * the guest may open is `authGuard`'s, which runs first and sends it to the one it has to do next.
 */
export const onboardingGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.restored();
  const session = auth.session();
  return isRegistering(session) || outsideRegistration(session, router, state);
};
