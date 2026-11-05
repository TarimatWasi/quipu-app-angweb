import type { MockRoute } from '../mock-types';
import { ADMIN_ADMINISTRATOR_ROUTES } from './admin-administrators.handlers';
import { ADMIN_GUEST_ACCOUNT_ROUTES } from './admin-guest-account.handlers';
import { ADMIN_GUEST_REGISTRATION_ROUTES } from './admin-guest-registration.handlers';
import { ADMIN_GUEST_ROUTES } from './admin-guests.handlers';
import { ADMIN_PAYMENT_ROUTES } from './admin-payments.handlers';
import { AUTH_ROUTES } from './auth.handlers';
import { GUEST_ROUTES } from './guest.handlers';

/**
 * Every route of the simulated BFF. A new screen adds its own `<area>.handlers.ts` next to these,
 * exporting a `MockRoute[]` keyed by `METHOD /bff/<path of the contract>`, and spreads it here.
 */
export const MOCK_ROUTES: readonly MockRoute[] = [
  ...AUTH_ROUTES,
  ...ADMIN_PAYMENT_ROUTES,
  ...ADMIN_GUEST_ROUTES,
  ...ADMIN_GUEST_REGISTRATION_ROUTES,
  ...ADMIN_GUEST_ACCOUNT_ROUTES,
  ...ADMIN_ADMINISTRATOR_ROUTES,
  ...GUEST_ROUTES,
];
