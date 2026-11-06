import { provideHttpClient, withInterceptors, withXsrfConfiguration } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { credentialsInterceptor } from '@core/interceptors/credentials.interceptor';
import { sessionExpiredInterceptor } from '@core/interceptors/session-expired.interceptor';
import { csrfErrorInterceptor } from '@core/interceptors/csrf-error.interceptor';
import { CsrfBootstrapService } from '@core/http/csrf-bootstrap.service';
import { firstValueFrom } from 'rxjs';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(
      withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }),
      withInterceptors([credentialsInterceptor, sessionExpiredInterceptor, csrfErrorInterceptor]),
    ),
    provideAppInitializer(() =>
      firstValueFrom(inject(CsrfBootstrapService).refresh()).catch(() => undefined),
    ),
  ],
};
