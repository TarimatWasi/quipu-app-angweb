import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { BFF_BASE_URL } from '@core/config/bff-base-url';
import { AuthService } from '@core/auth/auth.service';

/**
 * A 401 from the BFF on any call other than the login and /me means the session cookie is gone or expired:
 * forget the session in this tab and send the user to the login. The error still reaches the caller.
 * When this tab had a session, the login is told so (`expired=1`) and where the person was
 * (`returnUrl`), so it can explain what happened and take them back after signing in again (TAR-245).
 * Nobody is moved when they are already on the login, or on their way to it: it would wipe what
 * that page is showing, or what the first 401 told it.
 * Same-origin: the BFF is /bff; with an absolute base URL it is <base>/bff. The comparison is
 * case-insensitive and accepts /bff exactly, /bff/..., and /bff?query.
 */
export const sessionExpiredInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const bff = `${inject(BFF_BASE_URL)}/bff`.toLowerCase();
  const url = req.url.toLowerCase();
  const toBff = url === bff || url.startsWith(`${bff}/`) || url.startsWith(`${bff}?`);
  // The login answers its own 401, and /me (TAR-74) is the restoration asking: its 401 means "no
  // session" for AuthService, and must not wipe a session opened here while the answer was on its way.
  const answersItself = url === `${bff}/auth/login` || url === `${bff}/auth/me`;
  return next(req).pipe(
    catchError((error: unknown) => {
      if (toBff && !answersItself && error instanceof HttpErrorResponse && error.status === 401) {
        const hadSession = auth.session() !== null;
        auth.clear();
        const returnUrl = router.url;
        // Several calls may answer 401 together: the first one already sends the person to the
        // login, and a later one (with no session left) must not replace that trip with a plain one.
        const target = router.currentNavigation()?.extractedUrl;
        const goingToLogin = target !== undefined && isLogin(router.serializeUrl(target));
        if (!isLogin(returnUrl) && !goingToLogin) {
          void (hadSession
            ? router.navigate(['/login'], { queryParams: { expired: '1', returnUrl } })
            : router.navigateByUrl('/login'));
        }
      }
      return throwError(() => error);
    }),
  );
};

/** True for /login itself, with or without a query or a fragment. */
function isLogin(url: string): boolean {
  return /^\/login(?:[?#]|$)/.test(url);
}
