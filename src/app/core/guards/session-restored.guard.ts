import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';

/**
 * For a page open with or without a session (A0.7 «Página no encontrada»): it waits until the session
 * of a reload is restored, so the page knows which version to show. A session that must still
 * change its password goes to that page, as with authGuard (RF-12).
 */
export const sessionRestoredGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.restored();
  return auth.session()?.mustChangePassword ? router.createUrlTree(['/change-password']) : true;
};
