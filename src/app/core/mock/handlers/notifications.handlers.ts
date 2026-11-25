import type { components } from '@core/api/bff.generated';
import { nowInstant } from '../data/mock-dates';
import { ID_KIND } from '../data/mock-db';
import type { MockDb, NotificationRecord } from '../data/mock-db';
import { noContent, notFound, ok, paginate } from '../mock-reply';
import type { MockContext, MockRequest, MockRoute } from '../mock-types';

type Schemas = components['schemas'];

/** Whose bell a call reads: the shared inbox of the administrators or the own one of a guest. */
interface Inbox {
  readonly audience: string;
  /** The account that reads, which keeps its own read marks (by document). */
  readonly reader: string;
}

function adminInbox(ctx: MockContext): Inbox {
  return { audience: 'ADMIN', reader: ctx.requireAdmin().documentNumber };
}

/** /bff/guest/** is the area of the guest with a contract: the temporary guest gets a 403, as in the BFF. */
function guestInbox(ctx: MockContext): Inbox {
  const guest = ctx.requireGuest('CONTRACT');
  return { audience: guest.guestId, reader: guest.documentNumber };
}

function guestName(db: MockDb, guestId: string | null): string {
  const name = db.data.guests.find((guest) => guest.id === guestId)?.name;
  return name ?? 'Un huésped';
}

/**
 * The Spanish text of a notification, worded when read like in the BFF (so a corrected name shows
 * corrected). The administrators read who it is about; the guest reads about itself.
 */
function textOf(
  db: MockDb,
  record: NotificationRecord,
): Pick<Schemas['Notification'], 'title' | 'body'> {
  const who = guestName(db, record.guestId);
  switch (record.type) {
    case 'PAYMENT_PROOF_SUBMITTED':
      return { title: 'Comprobante por revisar', body: `${who} envió un comprobante de pago.` };
    case 'ONBOARDING_COMPLETED':
      return { title: 'Registro completo', body: `${who} terminó su registro.` };
    case 'GUEST_DOCUMENT_UPLOADED':
      return { title: 'Documento nuevo', body: `${who} subió un documento.` };
    case 'CONTRACT_EXPIRING':
      return {
        title: 'Contrato por vencer',
        body: `El contrato de ${who} vence en menos de 30 días.`,
      };
    case 'PAYMENT_OVERDUE':
      return { title: 'Pago vencido', body: `${who} tiene un pago vencido.` };
    case 'STAY_ENDING':
      return { title: 'Estadía por terminar', body: `La estadía de ${who} termina pronto.` };
    case 'ACCESS_EXPIRED':
      return { title: 'Acceso vencido', body: `El acceso de ${who} venció sin usarse.` };
    case 'PAYMENT_APPROVED':
      return { title: 'Pago aprobado', body: 'Tu pago fue aprobado.' };
    case 'PAYMENT_REJECTED':
      return { title: 'Pago rechazado', body: 'Tu pago fue rechazado. Revisa el motivo.' };
    case 'REFUND_CREATED':
      return { title: 'Devolución registrada', body: 'Se registró una devolución a tu favor.' };
    case 'FINE_APPLIED':
      return { title: 'Multa aplicada', body: 'Se aplicó una multa a tu cuenta.' };
    case 'CONTRACT_SIGNED':
      return { title: 'Contrato registrado', body: 'Tu contrato quedó registrado.' };
    case 'CONTRACT_TERMINATED':
      return { title: 'Contrato terminado', body: 'Tu contrato terminó.' };
    case 'PAYMENT_DUE':
      return { title: 'Pago pendiente', body: 'Hoy vence un pago.' };
    default:
      return { title: 'Aviso de la casa', body: 'Hay un aviso nuevo para ti.' };
  }
}

function inboxOf(db: MockDb, inbox: Inbox): NotificationRecord[] {
  return db.data.notifications
    .filter((record) => record.audience === inbox.audience)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function list(inbox: Inbox, req: MockRequest, db: MockDb): Schemas['PagedNotifications'] {
  const all = inboxOf(db, inbox);
  const unread = all.filter((record) => !record.readBy.has(inbox.reader));
  const page = paginate(req.query.get('unread') === 'true' ? unread : all, req.query);
  return {
    content: page.content.map((record) => ({
      id: record.id,
      type: record.type,
      ...textOf(db, record),
      createdAt: record.createdAt,
      readAt: record.readBy.get(inbox.reader) ?? null,
      target: record.target,
    })),
    nextCursor: page.nextCursor,
    unreadCount: unread.length,
  };
}

function read(inbox: Inbox, req: MockRequest, db: MockDb): void {
  const record = inboxOf(db, inbox).find((item) => item.id === req.params['id']);
  if (record === undefined) notFound();
  if (!record.readBy.has(inbox.reader)) record.readBy.set(inbox.reader, nowInstant());
}

function readAll(inbox: Inbox, db: MockDb): void {
  const now = nowInstant();
  for (const record of inboxOf(db, inbox)) {
    if (!record.readBy.has(inbox.reader)) record.readBy.set(inbox.reader, now);
  }
}

/**
 * Leaves a notification in a bell, as the confirmed events of the BFF do. Only the guest's own
 * actions and the administrator's decisions call it; the ones of the start of the day are seeded.
 */
export function notify(
  db: MockDb,
  fields: Omit<NotificationRecord, 'id' | 'readBy' | 'createdAt'>,
): void {
  db.data.notifications.push({
    ...fields,
    id: db.newId(ID_KIND.notification),
    createdAt: nowInstant(),
    readBy: new Map(),
  });
}

function routesOf(area: 'admin' | 'guest', inboxFor: (ctx: MockContext) => Inbox): MockRoute[] {
  return [
    {
      key: `GET /bff/${area}/notifications`,
      handler: (req, ctx) => ok(list(inboxFor(ctx), req, ctx.db)),
    },
    {
      key: `POST /bff/${area}/notifications/{id}/read`,
      handler: (req, ctx) => {
        read(inboxFor(ctx), req, ctx.db);
        return noContent();
      },
    },
    {
      key: `POST /bff/${area}/notifications/read-all`,
      handler: (_req, ctx) => {
        readAll(inboxFor(ctx), ctx.db);
        return noContent();
      },
    },
  ];
}

/** The bell of contract v0.27.0: the shared inbox of the administrators and the guest's own. */
export const NOTIFICATION_ROUTES: readonly MockRoute[] = [
  ...routesOf('admin', adminInbox),
  ...routesOf('guest', guestInbox),
];
