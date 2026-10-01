import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Base URL of the BFF. Empty means same-origin (/bff/* is forwarded by the platform); an absolute
 * https URL means a BFF on another origin. Injectable so tests can cover both setups.
 */
export const BFF_BASE_URL = new InjectionToken<string>('BFF_BASE_URL', {
  providedIn: 'root',
  factory: () => environment.bffBaseUrl,
});
