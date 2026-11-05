import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, GuestType } from '@core/auth/auth.service';
import { noAccess } from './no-access';

/**
 * Keeps the pages of one kind of guest for that kind (RN-09, RN-13; FE-ANG-RUT-02: it improves the
 * experience, the BFF answers 403 anyway). The administrator and the guest of the other kind see
 * «Sin acceso» (A0.7) under the same address; without a session, the login.
 */
function guestTypeGuard(guestType: GuestType): CanActivateFn {
  return async (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    await auth.restored();
    const session = auth.session();
    if (!session) {
      return router.createUrlTree(['/login']);
    }
    return (session.role === 'GUEST' && session.guestType === guestType) || noAccess(router, state);
  };
}

/** H3 and H4: only a guest with a contract. */
export const contractGuestGuard: CanActivateFn = guestTypeGuard('CONTRACT');

/** T2: only a temporary guest. */
export const temporaryGuestGuard: CanActivateFn = guestTypeGuard('TEMPORARY');
