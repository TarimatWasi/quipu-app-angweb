import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * TAR-300: the browser uses the same-origin /bff proxy, so the generated base is empty.
 * Injectable to verify fail-closed behavior when an unsupported absolute base is supplied.
 */
export const BFF_BASE_URL = new InjectionToken<string>('BFF_BASE_URL', {
  providedIn: 'root',
  factory: () => environment.bffBaseUrl,
});
