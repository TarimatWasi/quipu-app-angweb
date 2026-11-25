import type { components } from '@core/api/bff.generated';

type Target = components['schemas']['NotificationTarget'];

/** Whose bell it is: the administration, or a guest of each type (their pages differ). */
export type NotificationAudience = 'ADMIN' | 'CONTRACT' | 'TEMPORARY';

const escaped = (id: string) => encodeURIComponent(id);

function adminLink(target: Target): string | null {
  switch (target.kind) {
    case 'PAYMENT':
      return `/admin/payments/${escaped(target.id)}`;
    case 'GUEST':
      return `/admin/guests/${escaped(target.id)}`;
    case 'CONTRACT':
      return `/admin/contracts/${escaped(target.id)}`;
    case 'DOCUMENT':
      return target.guestId === undefined
        ? null
        : `/admin/guests/${escaped(target.guestId)}/documents`;
    default:
      return null;
  }
}

function contractGuestLink(target: Target): string | null {
  switch (target.kind) {
    case 'PAYMENT':
      return `/guest/payments/${escaped(target.id)}`;
    case 'CONTRACT':
      return '/guest/contract';
    case 'REFUND':
      return '/home';
    default:
      return null;
  }
}

function temporaryGuestLink(target: Target): string | null {
  switch (target.kind) {
    case 'PAYMENT':
      return `/temporary-guest/payment/${escaped(target.id)}`;
    case 'GUEST':
      return '/home';
    default:
      return null;
  }
}

const LINKS: Readonly<Record<NotificationAudience, (target: Target) => string | null>> = {
  ADMIN: adminLink,
  CONTRACT: contractGuestLink,
  TEMPORARY: temporaryGuestLink,
};

/**
 * The page a notification opens (its `target`), or null when it has none: then it is shown without
 * a link and the notification is the whole content. What contract v0.30.0 documents, by audience:
 * - administrator: the payment, the guest, the contract, and for a DOCUMENT the documents of its
 *   guest (`target.guestId`, only with DOCUMENT).
 * - guest with a contract: its payment, its contract, and for a REFUND its home, where its credit
 *   is (GET /guest/credit is read by the home). A FINE opens nothing.
 * - temporary guest: its payment, and GUEST its payment status (T1, at /home).
 * - an unknown kind (target.kind is extensible), or `target: null`, opens nothing.
 */
export function notificationLink(
  audience: NotificationAudience,
  target: Target | null,
): string | null {
  return target === null ? null : LINKS[audience](target);
}
