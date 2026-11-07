import type { Session } from '@core/auth/auth.service';

/**
 * One entry of the menu of the bar (P-01). `link` is null while its screen does not exist yet: the
 * entry is shown as «pronto», without a link, so it never leads to a broken route. To turn it on,
 * give it its route here. `matches` are other paths under which the entry is the current one.
 */
export interface NavEntry {
  readonly label: string;
  readonly link: string | null;
  readonly matches?: readonly string[];
}

type Audience = 'ADMIN' | 'CONTRACT' | 'TEMPORARY';

// The menus of the Estándar UI (P-01), in order. Inicio, Estado de cuenta and Estado de pago are the
// home of each role (/home shows A1, H1 or T1).
const SECTIONS: Readonly<Record<Audience, readonly NavEntry[]>> = {
  ADMIN: [
    { label: 'Inicio', link: '/home' },
    { label: 'Ambientes', link: '/admin/environments' },
    { label: 'Huéspedes', link: '/admin/guests' },
    { label: 'Contratos', link: '/admin/contracts' },
    { label: 'Pagos', link: '/admin/payments' },
    { label: 'Finanzas', link: '/admin/finance' },
  ],
  CONTRACT: [
    { label: 'Estado de cuenta', link: '/home' },
    { label: 'Mi contrato', link: '/guest/contract' },
    { label: 'Historial de pagos', link: '/guest/payments' },
    { label: 'Mis datos', link: '/guest/profile' },
  ],
  TEMPORARY: [
    { label: 'Estado de pago', link: '/home', matches: ['/temporary-guest/payment'] },
    { label: 'Mis datos', link: '/temporary-guest/profile' },
  ],
};

/**
 * One entry of the account menu besides «Salir»: a link to a page, or an action of the bar.
 * «Cambiar contraseña» (A0.6) is an action: it opens a dialog over the current page.
 */
export type AccountEntry =
  | { readonly kind: 'link'; readonly label: string; readonly link: string }
  | { readonly kind: 'changePassword'; readonly label: string };

// A7 lives in the account menu of the administrator, not in the bar: no section of the bar is the
// current one there. A link set to null would leave its entry out.
const ACCOUNT_LINKS: Readonly<Record<'administrators', string | null>> = {
  administrators: '/admin/administrators',
};

function audienceOf(session: Session): Audience | null {
  if (session.role === 'ADMIN') return 'ADMIN';
  return session.guestType ?? null;
}

/** The sections of the session; none for a guest without a known type (onboarding): only «Salir». */
export function sectionsFor(session: Session | null): readonly NavEntry[] {
  const audience = session && audienceOf(session);
  return audience ? SECTIONS[audience] : [];
}

/** The account menu without «Salir», which is always last and is a button. */
export function accountEntriesFor(session: Session | null): readonly AccountEntry[] {
  const changePassword: AccountEntry = { kind: 'changePassword', label: 'Cambiar contraseña' };
  const administrators = ACCOUNT_LINKS.administrators;
  return session?.role === 'ADMIN' && administrators !== null
    ? [changePassword, { kind: 'link', label: 'Administradores', link: administrators }]
    : [changePassword];
}

/** The label under the name in the account menu. */
export function roleLabelFor(session: Session | null): string {
  return session?.role === 'ADMIN' ? 'Administración' : 'Huésped';
}

function startsWithPath(url: string, path: string): boolean {
  return url === path || url.startsWith(`${path}/`) || url.startsWith(`${path}?`);
}

/** Whether the entry is the section the page belongs to (aria-current="page"). */
export function isCurrent(entry: NavEntry, url: string): boolean {
  if (entry.link === null) return false;
  return [entry.link, ...(entry.matches ?? [])].some((path) => startsWithPath(url, path));
}
