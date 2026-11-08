import {
  daysAgo,
  formatDate,
  formatDateTime,
  formatMoney,
  formatStay,
  monthName,
} from '@shared/payments/payment-format';
import { NO_NAME } from '@shared/text/guest-text';
import { documentOf, NO_ENVIRONMENT } from './dashboard-charges';
import type { AdminDashboard, DashboardCharge } from './dashboard-charges';

/**
 * «Lo que toca ahora» and «También pendiente» of A1 (decided 2026-11-01): one figure and one action
 * in this order — vouchers to review, overdue charges, rejected payments, refunds to register,
 * contracts about to expire and guests who have not activated —; the first that applies is the
 * panel and the others are listed under it, each with its link.
 */

/** Where a link goes: a page of the app, or the table of the same screen filtered by Atrasado. */
export type Destination =
  | {
      readonly kind: 'route';
      readonly link: readonly string[];
      readonly query: Readonly<Record<string, string>> | null;
    }
  | { readonly kind: 'overdue' };

export interface PendingLink {
  readonly label: string;
  readonly to: Destination;
}

export type PendingTone = 'danger' | 'warning' | 'neutral';

export interface Pending {
  readonly key: 'review' | 'overdue' | 'rejected' | 'refunds' | 'expiring' | 'inactive';
  readonly tone: PendingTone;
  /** As the panel says it when it is the first. */
  readonly figure: string;
  readonly label: string;
  readonly meta: string;
  /** The action of the panel; null while the screen it leads to does not exist yet. */
  readonly cta: PendingLink | null;
  /** As the list says it when it is not the first: «4 pagos por revisar:» then the sentence. */
  readonly head: string;
  readonly text: string;
  readonly link: PendingLink | null;
}

export interface NowContent {
  readonly figure: string;
  readonly label: string;
  readonly meta: string;
  readonly cta: PendingLink | null;
  /** The figure goes in red ink: the thing that waits is late or was rejected. */
  readonly urgent: boolean;
}

const route = (
  link: readonly string[],
  query: Readonly<Record<string, string>> | null = null,
): Destination => ({ kind: 'route', link, query });

const PAYMENTS: Destination = route(['/admin/payments']);
const CONTRACTS: Destination = route(['/admin/contracts']);
const FINANCE: Destination = route(['/admin/finance']);
const REJECTED: Destination = route(['/admin/payments'], { vista: 'rechazados' });

const plural = (count: number, one: string, many: string): string => (count === 1 ? one : many);
const nameOf = (name: string | null): string => name ?? NO_NAME;
const envOf = (code: string | null): string =>
  code === null || code === NO_ENVIRONMENT ? '' : ` (${code})`;

/** «a», «a y b», «a, b y c». */
function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} y ${names.at(-1) ?? ''}`;
}

/** The month of a contract period, or the dates of a stay: «septiembre», «20 – 31 oct». */
function when(ref: {
  readonly period: string | null;
  readonly stayStartDate: string | null;
  readonly stayEndDate: string | null;
}): string {
  if (ref.period !== null) return monthName(ref.period) ?? ref.period;
  return ref.stayStartDate !== null && ref.stayEndDate !== null
    ? formatStay(ref.stayStartDate, ref.stayEndDate)
    : '';
}

function review(d: AdminDashboard, now: Date): Pending | null {
  const total = d.pendingVouchersTotal;
  const oldest = d.pendingVouchers[0];
  if (total <= 0) return null;
  const ago = oldest === undefined ? '' : (daysAgo(oldest.submittedAt, now) ?? '');
  const who = oldest === undefined ? '' : nameOf(oldest.guestName);
  const month = oldest === undefined ? '' : when(oldest);
  return {
    key: 'review',
    tone: 'warning',
    figure: String(total),
    label: plural(total, 'pago por revisar', 'pagos por revisar'),
    meta:
      oldest === undefined
        ? ''
        : `${total === 1 ? 'Es' : 'El más antiguo es'} el de ${who} (${month}), enviado ${ago}.`,
    cta:
      oldest === undefined
        ? null
        : {
            label: 'Revisar el más antiguo',
            to: route(['/admin/payments', oldest.id], { vista: 'por-revisar' }),
          },
    head: `${String(total)} ${plural(total, 'pago por revisar', 'pagos por revisar')}:`,
    text: oldest === undefined ? '' : `el más antiguo, de ${month}, ${ago}.`,
    link: { label: 'Ir a Pagos', to: PAYMENTS },
  };
}

/** The action of the panel on the overdue charges, and whether it registers a payment. */
interface OverdueTarget {
  readonly cta: PendingLink;
  readonly registers: boolean;
  /** The first name of the guest it is for, for «Si Pedro te pagó en persona». */
  readonly firstName: string;
}

/** The overdue charge to act on: one with no payment yet, else the oldest one with its rejection. */
function overdueTarget(charges: readonly DashboardCharge[]): OverdueTarget | null {
  const late = charges
    .filter((charge) => charge.status === 'OVERDUE')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const fresh = late.find((charge) => !charge.paymentRejected);
  if (fresh !== undefined) {
    return {
      cta: {
        label: `Registrar pago de ${fresh.guestName ?? documentOf(fresh)}`,
        to: route(['/admin/payments', 'new'], { guestId: fresh.guestId }),
      },
      registers: true,
      firstName: nameOf(fresh.guestName).split(' ')[0] ?? '',
    };
  }
  const [rejected] = late;
  if (rejected?.paymentId == null) return null;
  return {
    cta: {
      label: `Corregir pago de ${rejected.guestName ?? documentOf(rejected)}`,
      to: route(['/admin/payments', rejected.paymentId], { vista: 'rechazados' }),
    },
    registers: false,
    firstName: '',
  };
}

function overdue(d: AdminDashboard): Pending | null {
  const { count, total, first } = d.overdue;
  if (count <= 0) return null;
  const target = overdueTarget(d.charges);
  const lines = first.map((ref) => {
    const rejected = d.charges.some(
      (charge) =>
        charge.guestId === ref.guestId &&
        charge.status === 'OVERDUE' &&
        charge.paymentRejected &&
        charge.period === ref.period &&
        charge.stayStartDate === ref.stayStartDate,
    );
    return `${nameOf(ref.guestName)}${envOf(ref.environmentCode)} venció el ${formatDate(ref.dueDate)}${
      rejected ? ' y tiene un pago rechazado por corregir' : ''
    }`;
  });
  const more = count > first.length ? ` y ${String(count - first.length)} más` : '';
  return {
    key: 'overdue',
    tone: 'danger',
    figure: formatMoney(total),
    label: 'en cobros atrasados',
    meta:
      `${lines.join('; ')}${more}.` +
      (target?.registers === true
        ? ` Si ${target.firstName} te pagó en persona, regístralo como pago directo.`
        : ''),
    cta: target?.cta ?? null,
    head: `${String(count)} ${plural(count, 'cobro atrasado', 'cobros atrasados')}:`,
    text: `${joinNames(first.map((ref) => `${nameOf(ref.guestName)}${envOf(ref.environmentCode)}`))}${more}, ${formatMoney(total)}.`,
    link: { label: 'Ver atrasados', to: { kind: 'overdue' } },
  };
}

function rejected(d: AdminDashboard, now: Date): Pending | null {
  const { count, oldest } = d.rejected;
  if (count <= 0) return null;
  const ago = oldest === null ? '' : (daysAgo(oldest.rejectedAt, now) ?? '');
  return {
    key: 'rejected',
    tone: 'danger',
    figure: String(count),
    label: plural(count, 'pago rechazado sin corregir', 'pagos rechazados sin corregir'),
    meta:
      oldest === null
        ? ''
        : `El más antiguo es el de ${nameOf(oldest.guestName)} (${when(oldest)}), rechazado ${ago}.`,
    cta: { label: 'Ver rechazados', to: REJECTED },
    head: `${String(count)} ${plural(count, 'pago rechazado sin corregir', 'pagos rechazados sin corregir')}:`,
    text:
      oldest === null ? '' : `el más antiguo es de ${nameOf(oldest.guestName)}, rechazado ${ago}.`,
    link: { label: 'Ver rechazados', to: REJECTED },
  };
}

function refunds(d: AdminDashboard): Pending | null {
  const { count, total } = d.refunds;
  if (count <= 0) return null;
  return {
    key: 'refunds',
    tone: 'warning',
    figure: formatMoney(total),
    label: `por devolver a ${String(count)} ${plural(count, 'huésped', 'huéspedes')}`,
    meta: plural(
      count,
      'Pagó de más y ya no tiene un mes donde usarlo.',
      'Pagaron de más y ya no tienen un mes donde usarlo.',
    ),
    cta: { label: 'Ir a Finanzas', to: FINANCE },
    head: `${String(count)} ${plural(count, 'devolución por registrar', 'devoluciones por registrar')}:`,
    text: `${formatMoney(total)} que ${plural(count, 'pagó', 'pagaron')} de más.`,
    link: { label: 'Ir a Finanzas', to: FINANCE },
  };
}

function expiring(d: AdminDashboard): Pending | null {
  const { count, first } = d.expiringContracts;
  if (count <= 0) return null;
  const who = first === null ? '' : `${nameOf(first.guestName)}${envOf(first.environmentCode)}`;
  const date = first === null ? '' : formatDate(first.endDate);
  return {
    key: 'expiring',
    tone: 'neutral',
    figure: String(count),
    label: plural(
      count,
      'contrato vence en 30 días o menos',
      'contratos vencen en 30 días o menos',
    ),
    meta:
      first === null
        ? ''
        : count === 1
          ? `${who} vence el ${date}. Si renueva, carga el contrato nuevo antes de esa fecha.`
          : `El primero en vencer es el de ${who}, el ${date}. Si renuevan, carga el contrato nuevo antes de esa fecha.`,
    cta: { label: 'Ver contratos por vencer', to: CONTRACTS },
    head: `${String(count)} ${plural(count, 'contrato por vencer', 'contratos por vencer')}:`,
    text: first === null ? '' : `${who}, el ${date}.`,
    link: { label: 'Ver contratos', to: CONTRACTS },
  };
}

function inactive(d: AdminDashboard): Pending | null {
  const { count, expired, first } = d.guestsNotActivated;
  if (count <= 0) return null;
  const doc = first === null ? '' : documentOf(first);
  let meta = 'Aún no abren su acceso.';
  let text = 'ninguno abrió su acceso todavía.';
  if (expired === 1 && first !== null) {
    meta = `Al ${doc} se le venció el acceso sin entrar: genera otro y entrégaselo.`;
    text = `al ${doc} se le venció el acceso.`;
  } else if (expired > 1) {
    meta = `A ${String(expired)} se les venció el acceso sin entrar: genera otro a cada uno y entrégaselo.`;
    text = `a ${String(expired)} se les venció el acceso.`;
  } else if (first?.accessExpiresAt != null) {
    meta = `El acceso del ${doc} vence el ${formatDateTime(first.accessExpiresAt)}.`;
    text = `el acceso del ${doc} vence el ${formatDateTime(first.accessExpiresAt)}.`;
  }
  const open: PendingLink | null =
    first === null ? null : { label: 'Ver huésped', to: route(['/admin/guests', first.guestId]) };
  return {
    key: 'inactive',
    tone: 'neutral',
    figure: String(count),
    label: plural(count, 'huésped sin activar', 'huéspedes sin activar'),
    meta,
    cta: open,
    head: `${String(count)} ${plural(count, 'huésped sin activar', 'huéspedes sin activar')}:`,
    text,
    link: open,
  };
}

/** What waits, most urgent first; empty when nothing does. */
export function pendingOf(d: AdminDashboard, now: Date): Pending[] {
  return [
    review(d, now),
    overdue(d),
    rejected(d, now),
    refunds(d),
    expiring(d),
    inactive(d),
  ].filter((pending) => pending !== null);
}

/** Nothing to show yet: no charge this month and nothing pending. */
export function isFirstUse(d: AdminDashboard, pending: readonly Pending[]): boolean {
  return d.charges.length === 0 && pending.length === 0;
}

export const FIRST_USE_NOW: NowContent = {
  figure: 'Bienvenida',
  label: 'Quipu aún no tiene datos',
  meta: 'Empieza por crear tus ambientes; después registra a tus huéspedes y carga sus contratos. Aquí verás los cobros de cada mes.',
  cta: { label: 'Nuevo ambiente', to: route(['/admin/environments', 'new']) },
  urgent: false,
};

/** One step of «Para empezar»; a step whose screen does not exist yet has no link. */
export interface FirstStep {
  readonly title: string;
  readonly text: string;
  readonly link: PendingLink | null;
}

export const FIRST_STEPS: readonly FirstStep[] = [
  {
    title: 'Crea tus ambientes',
    text: 'Habitaciones y cabañas, con su código.',
    link: { label: 'Ir a Ambientes', to: route(['/admin/environments']) },
  },
  {
    title: 'Registra a tus huéspedes',
    text: 'Con su documento; ellos completan sus datos.',
    link: { label: 'Ir a Huéspedes', to: route(['/admin/guests']) },
  },
  {
    title: 'Carga los contratos',
    text: 'Con la cuota, el día de pago y el PDF firmado.',
    link: { label: 'Ir a Contratos', to: CONTRACTS },
  },
];

/** The next charge that falls due, for the day nothing waits: «Miguel Torres (106), el 30 oct». */
function nextDue(d: AdminDashboard, today: string): string {
  const next = d.charges
    .filter((charge) => charge.status === 'UNPAID' && charge.dueDate >= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  return next === undefined
    ? ''
    : ` El próximo vencimiento es el de ${nameOf(next.guestName)}${envOf(next.environmentCode)}, el ${formatDate(next.dueDate)}.`;
}

/** The panel: the first thing that waits, or the calm of nothing pending, or the welcome. */
export function nowOf(d: AdminDashboard, pending: readonly Pending[], today: string): NowContent {
  const [first] = pending;
  if (first !== undefined) {
    return {
      figure: first.figure,
      label: first.label,
      meta: first.meta,
      cta: first.cta,
      urgent: first.tone === 'danger',
    };
  }
  if (isFirstUse(d, pending)) return FIRST_USE_NOW;
  return {
    figure: 'Al día',
    label: 'Nada pendiente',
    meta: `No hay pagos por revisar ni cobros atrasados.${nextDue(d, today)}`,
    cta: null,
    urgent: false,
  };
}
