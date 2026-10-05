import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

/** The password change page is for a signed-in session that still must change its password. */
export const passwordChangeGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.restored();
  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }
  return auth.session()?.mustChangePassword ? true : router.createUrlTree(['/home']);
};
