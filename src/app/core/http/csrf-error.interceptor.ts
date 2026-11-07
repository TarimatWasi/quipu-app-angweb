import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { CsrfBootstrapService } from './csrf-bootstrap.service';
import { isCsrfFailure } from './csrf-failure';

/** Invalidates readiness for an explicit new action; never replays a mutation or signs out. */
export const csrfErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const csrf = inject(CsrfBootstrapService);
  const ownBff = /^\/bff(?:[/?#]|$)/.test(request.url);
  return next(request).pipe(
    catchError((error: unknown) => {
      if (ownBff && isCsrfFailure(error)) csrf.invalidate();
      return throwError(() => error);
    }),
  );
};
