import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { noAccess } from './no-access';

/**
 * Keeps the administration pages for the administrator (FE-ANG-RUT-02: it improves the experience;
 * the BFF answers 403 anyway). A guest, with a contract or temporary, sees «Sin acceso» (A0.7)
 * under the same address; without a session, the login.
 */
export const adminGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.restored();
  const session = auth.session();
  if (!session) {
    return router.createUrlTree(['/login']);
  }
  return session.role === 'ADMIN' || noAccess(router, state);
};
