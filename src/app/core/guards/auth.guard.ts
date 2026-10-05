import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

/**
 * Improves the experience only; the real protection is the BFF's (FE-ANG-RUT-02). A session that
 * must still change its password (RF-12) goes to that page instead of the app.
 */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.restored();
  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }
  return auth.session()?.mustChangePassword ? router.createUrlTree(['/change-password']) : true;
};
