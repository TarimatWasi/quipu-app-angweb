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
  /** The name of a button to press before the capture, to show the dialog it opens. */
  readonly open?: string;
  readonly accountMenu?: boolean;
}

// Ids of the seeded data (src/app/core/mock/data): mockId(kind, n) of mock-db.ts.
const PENDING_PAYMENT_OF_LUIS = '00000005-0000-4000-8000-000000000005';
const REJECTED_PAYMENT_OF_LUIS = '00000005-0000-4000-8000-000000000004';
const PENDING_PAYMENT_OF_ANA = '00000005-0000-4000-8000-000000000013';
const TEMPORARY_GUEST_ANA = '00000001-0000-4000-8000-000000000003';
// A3.2: one guest per state of «Lo que toca ahora» (GUEST_IDS of demo-users.ts).
const GUEST_LUIS_OWING = '00000001-0000-4000-8000-000000000001';
const GUEST_PENDING = '00000001-0000-4000-8000-000000000005';
const GUEST_ONBOARDING = '00000001-0000-4000-8000-000000000008';
const GUEST_INACTIVE_OWING = '00000001-0000-4000-8000-000000000009';
const GUEST_UP_TO_DATE = '00000001-0000-4000-8000-000000000011';
const GUEST_WITHOUT_CONTRACT = '00000001-0000-4000-8000-000000000012';

const guestPage = (id: string) => `/admin/guests/${id}`;

export const SCREENS: readonly ScreenCapture[] = [
  { id: 'a0-login', path: '/login', role: 'anonymous', scenarios: ['normal'] },
  { id: 'a0-sesion-vencida', path: '/login?expired=1', role: 'anonymous', scenarios: ['normal'] },
  { id: 'a0-sesion-cerrada', path: '/login?signedOut=1', role: 'anonymous', scenarios: ['normal'] },
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
  { id: 'a0-7-no-encontrada-admin', path: '/no-existe', role: 'admin', scenarios: ['normal'] },
  {
    id: 'a0-7-no-encontrada-huesped',
    path: '/no-existe',
    role: 'contract-guest',
    scenarios: ['normal'],
  },
  {
    id: 'a0-7-no-encontrada-anonimo',
    path: '/no-existe',
    role: 'anonymous',
    scenarios: ['normal'],
  },
  // «Sin acceso» keeps the address that was asked for: the capture checks it stays there.
  { id: 'a0-7-sin-acceso', path: '/admin/payments', role: 'contract-guest', scenarios: ['normal'] },
  {
    id: 'a0-7-sin-acceso-temporal',
    path: '/admin/payments',
    role: 'temporary-guest',
    scenarios: ['normal'],
  },
  {
    id: 'cuenta-cambio-clave',
    path: '/home',
    role: 'admin',
    scenarios: ['normal'],
    accountMenu: true,
    open: 'Cambiar contraseña',
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
  {
    id: 'a5-cola',
    path: '/admin/payments',
    role: 'admin',
    scenarios: ['slow'],
    readiness: 'skeleton',
  },
  {
    id: 'a5-cola-rechazados',
    path: '/admin/payments?vista=rechazados',
    role: 'admin',
    scenarios: ['normal'],
  },
  { id: 'a5-1-pago-directo', path: '/admin/payments/new', role: 'admin', scenarios: ['normal'] },
  {
    id: 'a5-2-revision',
    path: `/admin/payments/${PENDING_PAYMENT_OF_LUIS}`,
    role: 'admin',
    scenarios: ['normal'],
  },
  {
    id: 'a5-2-rechazar',
    path: `/admin/payments/${PENDING_PAYMENT_OF_LUIS}`,
    role: 'admin',
    scenarios: ['normal'],
    open: 'Rechazar con motivo',
  },
  {
    id: 'a5-2-agregar-comprobante',
    path: `/admin/payments/${PENDING_PAYMENT_OF_LUIS}`,
    role: 'admin',
    scenarios: ['normal'],
    open: 'Agregar comprobante',
  },
  { id: 'h3-nuevo', path: '/guest/payments/new', role: 'contract-guest', scenarios: ['normal'] },
  {
    id: 'h3-correccion',
    path: `/guest/payments/${REJECTED_PAYMENT_OF_LUIS}`,
    role: 'contract-guest',
    scenarios: ['normal', 'load-error'],
  },
  {
    id: 'h3-lectura',
    path: `/guest/payments/${PENDING_PAYMENT_OF_LUIS}`,
    role: 'contract-guest',
    scenarios: ['normal'],
  },
  { id: 'h4-historial', path: '/guest/payments', role: 'contract-guest', scenarios: ['normal'] },
  {
    id: 't2-pago',
    path: '/temporary-guest/payment',
    role: 'temporary-guest',
    scenarios: ['normal'],
  },
  {
    id: 't2-lectura',
    path: `/temporary-guest/payment/${PENDING_PAYMENT_OF_ANA}`,
    role: 'temporary-guest',
    scenarios: ['normal'],
  },
  {
    id: 'a3-huespedes',
    path: '/admin/guests',
    role: 'admin',
    scenarios: ['normal', 'load-error'],
  },
  {
    id: 'a3-huespedes',
    path: '/admin/guests',
    role: 'admin',
    scenarios: ['slow'],
    readiness: 'skeleton',
  },
  { id: 'a3-1-nuevo-huesped', path: '/admin/guests/new', role: 'admin', scenarios: ['normal'] },
  {
    id: 'a3-2-temporal',
    path: guestPage(TEMPORARY_GUEST_ANA),
    role: 'admin',
    scenarios: ['normal', 'load-error'],
  },
  // «Servidor lento»: the skeleton of P-12, captured while the answer is on its way.
  {
    id: 'a3-2-temporal',
    path: guestPage(TEMPORARY_GUEST_ANA),
    role: 'admin',
    scenarios: ['slow'],
    readiness: 'skeleton',
  },
  { id: 'a3-2-con-deuda', path: guestPage(GUEST_LUIS_OWING), role: 'admin', scenarios: ['normal'] },
  { id: 'a3-2-al-dia', path: guestPage(GUEST_UP_TO_DATE), role: 'admin', scenarios: ['normal'] },
  { id: 'a3-2-pendiente', path: guestPage(GUEST_PENDING), role: 'admin', scenarios: ['normal'] },
  {
    id: 'a3-2-onboarding',
    path: guestPage(GUEST_ONBOARDING),
    role: 'admin',
    scenarios: ['normal'],
  },
  {
    id: 'a3-2-inactivo-deuda',
    path: guestPage(GUEST_INACTIVE_OWING),
    role: 'admin',
    scenarios: ['normal'],
  },
  {
    id: 'a3-2-sin-contrato',
    path: guestPage(GUEST_WITHOUT_CONTRACT),
    role: 'admin',
    scenarios: ['normal'],
  },
  // A3.8: Luis has two documents and one replacement in its history; the guest without a contract has none.
  {
    id: 'a3-8-documentos',
    path: guestPage(GUEST_LUIS_OWING) + '/documents',
    role: 'admin',
    scenarios: ['normal', 'load-error'],
  },
  {
    id: 'a3-8-documentos',
    path: guestPage(GUEST_LUIS_OWING) + '/documents',
    role: 'admin',
    scenarios: ['slow'],
    readiness: 'skeleton',
  },
  {
    id: 'a3-8-sin-documentos',
    path: guestPage(GUEST_WITHOUT_CONTRACT) + '/documents',
    role: 'admin',
    scenarios: ['normal'],
  },
  {
    id: 'a3-8-borrar',
    path: guestPage(GUEST_LUIS_OWING) + '/documents',
    role: 'admin',
    scenarios: ['normal'],
    open: 'Borrar documento-de-identidad.jpg',
  },
  {
    id: 'a3-8-reemplazar',
    path: guestPage(GUEST_LUIS_OWING) + '/documents',
    role: 'admin',
    scenarios: ['normal'],
    open: 'Reemplazar documento-de-identidad.jpg',
  },
  // H2: the contract of Luis, the guest with a contract of the demo.
  {
    id: 'h2-mi-contrato',
    path: '/guest/contract',
    role: 'contract-guest',
    scenarios: ['normal', 'load-error'],
  },
  {
    id: 'h2-mi-contrato',
    path: '/guest/contract',
    role: 'contract-guest',
    scenarios: ['slow'],
    readiness: 'skeleton',
  },
  // H5 and T3: Luis has two documents and a contract; Ana, the temporary guest, one document and a stay.
  {
    id: 'h5-mis-datos',
    path: '/guest/profile',
    role: 'contract-guest',
    scenarios: ['normal', 'load-error'],
  },
  {
    id: 'h5-mis-datos',
    path: '/guest/profile',
    role: 'contract-guest',
    scenarios: ['slow'],
    readiness: 'skeleton',
  },
  {
    id: 't3-mis-datos',
    path: '/temporary-guest/profile',
    role: 'temporary-guest',
    scenarios: ['normal'],
  },
  {
    id: 'a7-administradores',
    path: '/admin/administrators',
    role: 'admin',
    scenarios: ['normal', 'load-error'],
  },
  {
    id: 'a7-nuevo-administrador',
    path: '/admin/administrators',
    role: 'admin',
    scenarios: ['normal'],
    open: 'Nuevo administrador',
  },
  {
    id: 'a7-administradores',
    path: '/admin/administrators',
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
  {
    id: 'a3-5-documento',
    path: guestPage(GUEST_PENDING) + '/document',
    role: 'admin',
    scenarios: ['normal', 'load-error'],
  },
  {
    id: 'a3-5-documento',
    path: guestPage(GUEST_PENDING) + '/document',
    role: 'admin',
    scenarios: ['slow'],
    readiness: 'skeleton',
  },
  {
    id: 'a3-5-estadia-corregir',
    path: guestPage(TEMPORARY_GUEST_ANA) + '/stays/00000004-0000-4000-8000-000000000002',
    role: 'admin',
    scenarios: ['normal', 'load-error'],
  },
  {
    id: 'a3-5-estadia-corregir',
    path: guestPage(TEMPORARY_GUEST_ANA) + '/stays/00000004-0000-4000-8000-000000000002',
    role: 'admin',
    scenarios: ['slow'],
    readiness: 'skeleton',
  },
  ...[
    { id: 'h1-inicio-huesped', path: '/home', role: 'contract-guest' },
    { id: 't1-inicio-temporal', path: '/home', role: 'temporary-guest' },
    { id: 'h3-nuevo', path: '/guest/payments/new', role: 'contract-guest' },
    {
      id: 'h3-correccion',
      path: `/guest/payments/${REJECTED_PAYMENT_OF_LUIS}`,
      role: 'contract-guest',
    },
    {
      id: 'h3-lectura',
      path: `/guest/payments/${PENDING_PAYMENT_OF_LUIS}`,
      role: 'contract-guest',
    },
    { id: 'h4-historial', path: '/guest/payments', role: 'contract-guest' },
    { id: 't2-pago', path: '/temporary-guest/payment', role: 'temporary-guest' },
    {
      id: 't2-lectura',
      path: `/temporary-guest/payment/${PENDING_PAYMENT_OF_ANA}`,
      role: 'temporary-guest',
    },
    { id: 'a5-2-revision', path: `/admin/payments/${PENDING_PAYMENT_OF_LUIS}`, role: 'admin' },
    { id: 'a5-1-pago-directo', path: '/admin/payments/new', role: 'admin' },
  ].map((screen) => ({
    ...screen,
    role: screen.role as ScreenRole,
    scenarios: ['slow'] as const,
    readiness: 'skeleton' as const,
  })),
];
