import type { components } from '@core/api/bff.generated';

type Target = components['schemas']['NotificationTarget'];

/** Whose bell it is: the administration, or a guest of each type (their pages differ). */
export type NotificationAudience = 'ADMIN' | 'CONTRACT' | 'TEMPORARY';

const id = (target: Target) => encodeURIComponent(target.id);

/**
 * The page a notification opens (its `target`), or null when it has none: then it is shown without
 * a link. What the BFF agreed (2026-11-25):
 * - the administrator opens the payment, the guest or the contract. A DOCUMENT has no page of its
 *   own yet (the contract only reads the documents of a guest by the guest's id): no link until
 *   the contract says how. FINE and REFUND never reach the administrator.
 * - the guest opens its payment and its contract; GUEST (itself, a stay's PAYMENT_DUE), FINE and
 *   REFUND have no page by id and open its home, where its account, debt and credit are.
 * - an unknown kind, or none (`target: null`, which the contract allows), has no link.
 */
export function notificationLink(
  audience: NotificationAudience,
  target: Target | null,
): string | null {
  if (target === null) return null;
  if (audience === 'ADMIN') {
    switch (target.kind) {
      case 'PAYMENT':
        return `/admin/payments/${id(target)}`;
      case 'GUEST':
        return `/admin/guests/${id(target)}`;
      case 'CONTRACT':
        return `/admin/contracts/${id(target)}`;
      default:
        return null;
    }
  }
  switch (target.kind) {
    case 'PAYMENT':
      return audience === 'CONTRACT'
        ? `/guest/payments/${id(target)}`
        : `/temporary-guest/payment/${id(target)}`;
    case 'CONTRACT':
      return audience === 'CONTRACT' ? '/guest/contract' : '/home';
    case 'GUEST':
    case 'FINE':
    case 'REFUND':
      return '/home';
    default:
      return null;
  }
}
