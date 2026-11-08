import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { registrationTarget } from './onboarding';

/**
 * Improves the experience only; the real protection is the BFF's (FE-ANG-RUT-02). A session that
 * must still change its password (RF-12) goes to that page instead of the app, and a guest that has
 * not finished its registration goes to the step it has to do next (TAR-141, RN-33).
 */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.restored();
  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }
  const session = auth.session();
  if (session?.mustChangePassword) return router.createUrlTree(['/change-password']);
  const target = registrationTarget(session, state.url);
  return target === null ? true : router.createUrlTree([target]);
};
