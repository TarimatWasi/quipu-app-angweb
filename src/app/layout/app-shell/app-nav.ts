import type { Session } from '@core/services/auth.service';

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
    { label: 'Ambientes', link: null },
    { label: 'Huéspedes', link: null },
    { label: 'Contratos', link: null },
    { label: 'Pagos', link: '/admin/payments' },
    { label: 'Finanzas', link: null },
  ],
  CONTRACT: [
    { label: 'Estado de cuenta', link: '/home' },
    { label: 'Mi contrato', link: null },
    { label: 'Historial de pagos', link: '/guest/payments' },
    { label: 'Mis datos', link: null },
  ],
  TEMPORARY: [
    { label: 'Estado de pago', link: '/home', matches: ['/temporary-guest/payment'] },
    { label: 'Mis datos', link: null },
  ],
};

// A0.6 exists only as the forced change of the first login (its guard sends any other session to
// /home), so «Cambiar contraseña» waits for its own route. A7 does not exist yet: while this is
// null, «Administradores» is left out of the administrator's account menu.
const ACCOUNT_LINKS: Readonly<Record<'changePassword' | 'administrators', string | null>> = {
  changePassword: null,
  administrators: null,
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
export function accountEntriesFor(session: Session | null): readonly NavEntry[] {
  const changePassword: NavEntry = {
    label: 'Cambiar contraseña',
    link: ACCOUNT_LINKS.changePassword,
  };
  const administrators = ACCOUNT_LINKS.administrators;
  return session?.role === 'ADMIN' && administrators !== null
    ? [changePassword, { label: 'Administradores', link: administrators }]
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
