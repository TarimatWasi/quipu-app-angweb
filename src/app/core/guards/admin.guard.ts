import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';

/**
 * Keeps the administration pages for the administrator (FE-ANG-RUT-02: it improves the experience;
 * the BFF answers 403 anyway). A guest, with a contract or temporary, goes back to its own home.
 */
export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.restored();
  const session = auth.session();
  if (!session) {
    return router.createUrlTree(['/login']);
  }
  return session.role === 'ADMIN' || router.createUrlTree(['/home']);
};
