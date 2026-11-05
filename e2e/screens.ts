// QP-UI-13, ADR-F7 (fase 1): the screens captured at 1440, 768 and 390 px on the `mock` profile to
// compare them with the canvas. Evidence only: nothing here asserts a flow against the backend.
// To capture a new screen, add an entry: one PNG per scenario and width,
// `<id>__<scenario>__<width>.png`, so keep `id` stable once the screen has captures.
import type { DemoUserKey } from '../src/app/core/mock/data/demo-users';
import type { MockScenario } from '../src/app/core/mock/mock-scenarios';

/** A demo account of the simulated BFF (src/app/core/mock/data/demo-users.ts), or no session. */
export type ScreenRole = DemoUserKey | 'anonymous';

/** What the screen must show before the capture: its content, or the skeleton of a slow answer. */
export type ScreenReadiness = 'content' | 'skeleton';

export interface ScreenCapture {
  /** Stable prefix of the file name: the canvas code and a short name, in kebab-case. */
  readonly id: string;
  /** The route the capture opens once the session of `role` is in force. */
  readonly path: string;
  readonly role: ScreenRole;
  /** The scenarios of the mock panel to capture; each one is a separate PNG. */
  readonly scenarios: readonly MockScenario[];
  /** Defaults to `content`: wait until no region is busy. */
  readonly readiness?: ScreenReadiness;
}

// Ids of the seeded data (src/app/core/mock/data): mockId(kind, n) of mock-db.ts.
const PENDING_PAYMENT_OF_LUIS = '00000005-0000-4000-8000-000000000005';
const TEMPORARY_GUEST_ANA = '00000001-0000-4000-8000-000000000003';

export const SCREENS: readonly ScreenCapture[] = [
  { id: 'a0-login', path: '/login', role: 'anonymous', scenarios: ['normal'] },
  {
    id: 'a0-1-cambio-clave',
    path: '/change-password',
    role: 'temporary-password',
    scenarios: ['normal'],
  },
  { id: 'a0-2-recuperar', path: '/forgot-password', role: 'anonymous', scenarios: ['normal'] },
  {
    id: 'a0-4-activar-cuenta',
    path: '/activate#token=demo',
    role: 'anonymous',
    scenarios: ['normal'],
  },
  {
    id: 'a0-5-activar-administrador',
    path: '/activate-admin?code=admin-nuevo',
    role: 'anonymous',
    scenarios: ['normal'],
  },
  { id: 'inicio-admin', path: '/home', role: 'admin', scenarios: ['normal'] },
  { id: 'h1-inicio-huesped', path: '/home', role: 'contract-guest', scenarios: ['normal'] },
  { id: 't1-inicio-temporal', path: '/home', role: 'temporary-guest', scenarios: ['normal'] },
  {
    id: 'a5-cola',
    path: '/admin/payments',
    role: 'admin',
    scenarios: ['normal', 'empty', 'load-error'],
  },
  { id: 'a5-1-pago-directo', path: '/admin/payments/new', role: 'admin', scenarios: ['normal'] },
  {
    id: 'a5-2-revision',
    path: `/admin/payments/${PENDING_PAYMENT_OF_LUIS}`,
    role: 'admin',
    scenarios: ['normal'],
  },
  { id: 'h3-nuevo', path: '/guest/payments/new', role: 'contract-guest', scenarios: ['normal'] },
  { id: 'h4-historial', path: '/guest/payments', role: 'contract-guest', scenarios: ['normal'] },
  {
    id: 't2-pago',
    path: '/temporary-guest/payment',
    role: 'temporary-guest',
    scenarios: ['normal'],
  },
  {
    id: 'a3-2-huesped-temporal',
    path: `/admin/guests/${TEMPORARY_GUEST_ANA}`,
    role: 'admin',
    scenarios: ['normal'],
  },
  // «Servidor lento»: the skeleton of P-12 (A5 has none yet), captured while the answer is on its way.
  {
    id: 'a3-2-huesped-temporal',
    path: `/admin/guests/${TEMPORARY_GUEST_ANA}`,
    role: 'admin',
    scenarios: ['slow'],
    readiness: 'skeleton',
  },
  {
    id: 'a3-5-estadia-nueva',
    path: `/admin/guests/${TEMPORARY_GUEST_ANA}/stays/new`,
    role: 'admin',
    scenarios: ['normal'],
  },
];
