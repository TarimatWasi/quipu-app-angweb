import { MockRequestControls } from './mock-request-controls';
import {
  HttpErrorResponse,
  HttpHeaders,
  HttpInterceptorFn,
  HttpResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { mergeMap, of, throwError } from 'rxjs';
import { BFF_BASE_URL } from '@core/config/bff-base-url';
import { MOCK_BUNDLE_MARKER, MOCK_HEADER, MockBff } from './mock-bff';
import { MockCsrfService } from './mock-csrf.service';

/**
 * The path of a call to the BFF (`/bff/...`, without query or fragment), or null for any other URL.
 * With an absolute base URL the call is `<base>/bff/...`; same-origin it is `/bff/...`.
 */
export function bffPath(url: string, baseUrl: string): string | null {
  const relative = baseUrl !== '' && url.startsWith(baseUrl) ? url.slice(baseUrl.length) : url;
  const path = relative.split(/[?#]/, 1)[0] ?? '';
  return path.startsWith('/bff/') ? path : null;
}

/**
 * Only in the `mock` build (QP-ANGWEB-ENV-01, D-87): answers every call to /bff/* from the BFF
 * simulated in memory, after a short delay, without touching the network. Any other URL passes on.
 * It goes last in the chain, so the other interceptors see its answers as the BFF's.
 */
export const mockBffInterceptor: HttpInterceptorFn = (req, next) => {
  const path = bffPath(req.url, inject(BFF_BASE_URL));
  if (path === null) {
    return next(req);
  }
  const bff = inject(MockBff);
  const csrf = inject(MockCsrfService);
  const headers = new HttpHeaders({
    [MOCK_HEADER]: MOCK_BUNDLE_MARKER,
    ...(path === '/bff/auth/csrf' ? { 'Cache-Control': 'no-store' } : {}),
  });
  return inject(MockRequestControls)
    .dispatch(
      { method: req.method, path, query: req.params, body: req.body },
      () =>
        csrf.handle(req, path, () =>
          bff.handle({ method: req.method, path, query: req.params, body: req.body }),
        ),
      bff.latencyMs(),
    )
    .pipe(
      mergeMap(({ status, body }) =>
        status < 400
          ? of(new HttpResponse({ status, body, headers, url: req.urlWithParams }))
          : throwError(
              () => new HttpErrorResponse({ status, error: body, headers, url: req.urlWithParams }),
            ),
      ),
    );
};
