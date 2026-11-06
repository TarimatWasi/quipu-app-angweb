import { DOCUMENT } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  ApplicationRef,
  createComponent,
  EnvironmentInjector,
  inject,
  provideAppInitializer,
} from '@angular/core';
import { mockBffInterceptor } from './mock-bff.interceptor';
import { MockPanelComponent } from './mock-panel.component';

// QP-ANGWEB-ENV-01, D-87: only src/main.mock.ts, the entry point of the `mock` build
// (angular.json), imports this file. Production, development and the local and dev profiles start
// from src/main.ts and carry none of core/mock; the prueba de build (scripts/mock-bundle.mjs)
// proves it on the production bundle.

/** Adds the floating panel of roles and scenarios to the page, outside the routed views. */
export function mountMockPanel(): void {
  const document = inject(DOCUMENT);
  const host = document.createElement('app-mock-panel');
  document.body.appendChild(host);
  const panel = createComponent(MockPanelComponent, {
    environmentInjector: inject(EnvironmentInjector),
    hostElement: host,
  });
  inject(ApplicationRef).attachView(panel.hostView);
}

/**
 * The app configuration plus the simulated BFF. The interceptors of a second provideHttpClient
 * add up after those of `config`, so the mock answers last: credentials and session-expired see
 * its answers as the BFF's.
 */
export function withMockBff(config: ApplicationConfig): ApplicationConfig {
  return {
    ...config,
    providers: [
      ...config.providers,
      provideHttpClient(withInterceptors([mockBffInterceptor])),
      provideAppInitializer(mountMockPanel),
    ],
  };
}
