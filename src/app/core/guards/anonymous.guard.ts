import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';

/** How long the login waits to learn whether the browser already has a session. */
export const SESSION_WAIT_MS = 2000;

/**
 * Keeps a user who is already signed in away from the login and recovery pages (TAR-318). After a
 * reload typed in the address bar the session is not restored yet, so it asks the BFF first
 * (`restored()`), as `authGuard` does. The login must not wait for a sleeping server (a cold Render
 * takes about 80 s): after `SESSION_WAIT_MS` it opens, and if the session shows up later the person
 * is taken to the home from where they are.
 */
export const anonymousGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const home = router.createUrlTree(['/home']);
  if (auth.isAuthenticated()) return home;

  const signedIn = auth.restored().then(() => auth.isAuthenticated());
  const waited = new Promise<null>((resolve) => {
    setTimeout(() => {
      resolve(null);
    }, SESSION_WAIT_MS);
  });
  const early = await Promise.race([signedIn, waited]);
  if (early === true) return home;
  if (early === null) {
    void signedIn.then((late) => {
      if (late && router.url === state.url) void router.navigateByUrl(home);
    });
  }
  return true;
};
