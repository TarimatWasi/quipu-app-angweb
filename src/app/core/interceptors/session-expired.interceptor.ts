import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '@core/services/auth.service';
import { environment } from '../../../environments/environment';

const LOGIN_URL = `${environment.bffBaseUrl}/bff/auth/login`;

/**
 * A 401 from the BFF on any call other than the login means the session cookie is gone or expired:
 * forget the session in this tab and send the user to the login. The error still reaches the caller.
 */
export const sessionExpiredInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toBff = req.url.startsWith(`${environment.bffBaseUrl}/`);
  return next(req).pipe(
    catchError((error: unknown) => {
      if (
        toBff &&
        req.url !== LOGIN_URL &&
        error instanceof HttpErrorResponse &&
        error.status === 401
      ) {
        auth.clear();
        void router.navigateByUrl('/login');
      }
      return throwError(() => error);
    }),
  );
};
