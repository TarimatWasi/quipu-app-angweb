import { provideHttpClient, withInterceptors, withXsrfConfiguration } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { PreloadAllModules, provideRouter, withPreloading } from '@angular/router';
import { credentialsInterceptor } from '@core/http/credentials.interceptor';
import { sessionExpiredInterceptor } from '@core/http/session-expired.interceptor';
import { sessionRefreshInterceptor } from '@core/http/session-refresh.interceptor';
import { csrfErrorInterceptor } from '@core/http/csrf-error.interceptor';
import { CsrfBootstrapService } from '@core/http/csrf-bootstrap.service';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    // The chunks of the other screens load in the background once the first one is up.
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(
      withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }),
      // The refresh goes inside the session guard: a 401 is renewed first, and only a session that
      // cannot be renewed reaches sessionExpiredInterceptor (TAR-360).
      withInterceptors([
        credentialsInterceptor,
        sessionExpiredInterceptor,
        sessionRefreshInterceptor,
        csrfErrorInterceptor,
      ]),
    ),
    // The screen does not wait for the token: every mutation goes through `protect`, which waits
    // for this same request, so the page shows its skeleton while the server answers.
    provideAppInitializer(() => {
      inject(CsrfBootstrapService)
        .refresh()
        .subscribe({
          error: () => undefined,
        });
    }),
  ],
};
