import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { BFF_BASE_URL } from '@core/config/bff-base-url';
import { AuthService } from '@core/services/auth.service';

/**
 * A 401 from the BFF on any call other than the login means the session cookie is gone or expired:
 * forget the session in this tab and send the user to the login. The error still reaches the caller.
 * Same-origin: the BFF is /bff; with an absolute base URL it is <base>/bff. The comparison is
 * case-insensitive and accepts /bff exactly, /bff/..., and /bff?query.
 */
export const sessionExpiredInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const bff = `${inject(BFF_BASE_URL)}/bff`.toLowerCase();
  const url = req.url.toLowerCase();
  const toBff = url === bff || url.startsWith(`${bff}/`) || url.startsWith(`${bff}?`);
  const isLogin = url === `${bff}/auth/login`;
  return next(req).pipe(
    catchError((error: unknown) => {
      if (toBff && !isLogin && error instanceof HttpErrorResponse && error.status === 401) {
        auth.clear();
        void router.navigateByUrl('/login');
      }
      return throwError(() => error);
    }),
  );
};
