// Seeded bell notifications (contract v0.27.0): a few of each inbox, so the bell of every demo
// account has something to show, one of them already read and one of a type this client does not
// know (forward compatible: it shows with its title and body).
import { GUEST_IDS } from './demo-users';
import { addDays, instantOn, today } from './mock-dates';
import { ID_KIND, mockId } from './mock-db';
import type { NotificationRecord, PaymentRecord } from './mock-db';
import { FINE_IDS } from './seed-finance';
import { CONTRACT_IDS } from './seed-people';

/** The document of the demo administrator, who has already read the oldest notification. */
const ADMIN_DOCUMENT = '40000001';

let sequence = 0;

function notification(
  fields: Omit<NotificationRecord, 'id' | 'readBy'>,
  readBy: readonly (readonly [string, string])[] = [],
): NotificationRecord {
  sequence += 1;
  return { ...fields, id: mockId(ID_KIND.notification, sequence), readBy: new Map(readBy) };
}

function adminNotifications(payments: readonly PaymentRecord[]): NotificationRecord[] {
  const day = today();
  const pending = payments.find((p) => p.status === 'PENDING');
  return [
    ...(pending
      ? [
          notification({
            audience: 'ADMIN',
            type: 'PAYMENT_PROOF_SUBMITTED',
            createdAt: instantOn(day, 9),
            target: { kind: 'PAYMENT', id: pending.id },
            guestId: pending.guestId,
          }),
        ]
      : []),
    notification({
      audience: 'ADMIN',
      type: 'PAYMENT_OVERDUE',
      createdAt: instantOn(day, 8),
      target: { kind: 'GUEST', id: GUEST_IDS.owing },
      guestId: GUEST_IDS.owing,
    }),
    notification({
      audience: 'ADMIN',
      type: 'CONTRACT_EXPIRING',
      createdAt: instantOn(addDays(day, -1), 8),
      target: { kind: 'CONTRACT', id: CONTRACT_IDS.maria },
      guestId: GUEST_IDS.maria,
    }),
    notification(
      {
        audience: 'ADMIN',
        type: 'ONBOARDING_COMPLETED',
        createdAt: instantOn(addDays(day, -3), 16),
        target: { kind: 'GUEST', id: GUEST_IDS.luis },
        guestId: GUEST_IDS.luis,
      },
      [[ADMIN_DOCUMENT, instantOn(addDays(day, -3), 17)]],
    ),
  ];
}

function guestNotifications(payments: readonly PaymentRecord[]): NotificationRecord[] {
  const day = today();
  const approved = payments.find((p) => p.guestId === GUEST_IDS.luis && p.status === 'APPROVED');
  return [
    ...(approved
      ? [
          notification({
            audience: GUEST_IDS.luis,
            type: 'PAYMENT_APPROVED',
            createdAt: instantOn(day, 11),
            target: { kind: 'PAYMENT', id: approved.id },
            guestId: GUEST_IDS.luis,
          }),
        ]
      : []),
    notification({
      audience: GUEST_IDS.luis,
      type: 'FINE_APPLIED',
      createdAt: instantOn(addDays(day, -2), 12),
      target: { kind: 'FINE', id: FINE_IDS.noise },
      guestId: GUEST_IDS.luis,
    }),
    notification({
      audience: GUEST_IDS.luis,
      type: 'HOUSE_ANNOUNCEMENT',
      createdAt: instantOn(addDays(day, -4), 10),
      target: null,
      guestId: GUEST_IDS.luis,
    }),
  ];
}

export function seedNotifications(payments: readonly PaymentRecord[]): NotificationRecord[] {
  sequence = 0;
  return [...adminNotifications(payments), ...guestNotifications(payments)];
}
