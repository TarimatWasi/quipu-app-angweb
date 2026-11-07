import type { GuestDetail, PeriodStatus, Stay } from '@core/api/clients/admin-guests.service';
import {
  daysAgo,
  formatDate,
  formatMoney,
  formatPeriod,
  monthName,
} from '@shared/payments/payment-format';
import { joinWords, onboardingSteps } from './detail-side';
import { isAccessExpired, limaDay, whenText } from './guest-list-texts';
import { stayDatesWithYear } from './guest-texts';
import { openPayment, PERIOD_BADGES, registerPayment } from '@shared/payments/period-rows';
import type { PaymentAction, PeriodState, StateBadge } from '@shared/payments/period-rows';

/** A3.2 «Lo que toca ahora»: one figure, its context and at most one primary action. */

export type PanelAction =
  | ({ readonly kind: 'link' } & PaymentAction)
  | { readonly kind: 'generate-access'; readonly label: string }
  | { readonly kind: 'reactivate'; readonly label: string };

export interface DetailPanel {
  readonly figure: string;
  /** The figure in red: what is owed or an access that no longer works. */
  readonly alarm: boolean;
  readonly label: string;
  readonly badge: StateBadge | null;
  readonly text: string;
  readonly action: PanelAction | null;
}

export interface PanelInput {
  readonly guest: GuestDetail;
  /** The months of its contracts (account-status); empty for a temporary guest. */
  readonly periods: readonly PeriodStatus[];
  /** Its stays, newest first; empty for a guest with a contract. */
  readonly stays: readonly Stay[];
  readonly now: Date;
  /** It was reactivated from this page a moment ago. */
  readonly reactivated: boolean;
}

/** A month of a contract or a stay, as the panel weighs them. */
interface Charge {
  /** «Octubre 2026» or «Estadía del 20 – 27 oct 2026», at the start of a sentence. */
  readonly title: string;
  /** «octubre 2026» or «la estadía del 20 – 27 oct 2026», inside one. */
  readonly inSentence: string;
  /** What «Está al día: pagó …» says: «octubre» or «su estadía del 20 – 27 oct 2026». */
  readonly paidText: string;
  readonly order: string;
  readonly state: PeriodState;
  readonly dueDate: string;
  readonly amountDue: number;
  readonly paymentId: string | null;
  readonly rejectionReason: string | null;
}

function periodCharge(item: PeriodStatus): Charge {
  const month = monthName(item.period);
  const year = item.period.slice(0, 4);
  return {
    title: formatPeriod(item.period),
    inSentence: month === null ? item.period : `${month} ${year}`,
    paidText: month ?? item.period,
    order: item.period,
    state: item.status,
    dueDate: item.dueDate,
    amountDue: item.amountDue,
    paymentId: item.paymentId ?? null,
    rejectionReason: item.rejectionReason ?? null,
  };
}

function stayCharge(stay: Stay): Charge {
  const dates = stayDatesWithYear(stay.startDate, stay.endDate);
  return {
    title: `Estadía del ${dates}`,
    inSentence: `la estadía del ${dates}`,
    paidText: `su estadía del ${dates}`,
    order: stay.startDate,
    state: stay.paymentStatus,
    dueDate: stay.endDate,
    amountDue: stay.agreedAmount,
    paymentId: stay.paymentId,
    rejectionReason: null,
  };
}

/** Oldest first. */
function chargesOf(input: PanelInput): Charge[] {
  const charges =
    input.guest.type === 'CONTRACT' ? input.periods.map(periodCharge) : input.stays.map(stayCharge);
  return charges.sort((a, b) => a.order.localeCompare(b.order));
}

function total(charges: readonly Charge[]): string {
  return formatMoney(Math.round(charges.reduce((sum, c) => sum + c.amountDue, 0) * 100) / 100);
}

/** «5 oct»: the day and month of a due date, without the year. */
function dayMonth(isoDate: string): string {
  return formatDate(isoDate).replace(/ \d{4}$/, '');
}

const GENERATE: PanelAction = { kind: 'generate-access', label: 'Generar otro acceso' };

export const EXPIRED_AFTER_REACTIVATION_TEXT =
  'Venció mientras estaba inactivo. Genera otro y entrégaselo: el anterior ya no sirve.';
export const EXPIRED_TEXT =
  'Nadie lo usó a tiempo. Genera otro y entrégaselo: el anterior ya no sirve.';

/** «18 min», «3 h» or «2 días» left to use the access. */
function timeLeft(ms: number): string {
  const minutes = Math.ceil(ms / 60_000);
  if (minutes < 60) return `${String(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${String(hours)} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? '1 día' : `${String(days)} días`;
}

/** 1 and 2: a guest pending activation, its access still usable or already expired. */
function accessPanel(guest: GuestDetail, now: Date, reactivated: boolean): DetailPanel {
  const expiresAt = guest.accessExpiresAt ?? null;
  if (expiresAt === null || isAccessExpired(expiresAt, now)) {
    return {
      figure: 'Vencido',
      alarm: true,
      label: 'su acceso',
      badge: null,
      text: reactivated ? EXPIRED_AFTER_REACTIVATION_TEXT : EXPIRED_TEXT,
      action: GENERATE,
    };
  }
  const instant = new Date(expiresAt);
  return {
    figure: timeLeft(instant.getTime() - now.getTime()),
    alarm: false,
    label: 'para que use su acceso',
    badge: null,
    text: `El acceso que generaste vence ${whenText(instant, now)} (vale 30 minutos). Si no le llegó o venció, genera otro: el anterior deja de servir.`,
    action: GENERATE,
  };
}

/** 3: in the onboarding, how many of the four steps it took and what is missing. */
function onboardingPanel(guest: GuestDetail): DetailPanel {
  const steps = onboardingSteps(guest.onboardingProgress);
  const missing = steps.filter((step) => !step.done).map((step) => step.inSentence);
  const done = steps.length - missing.length;
  const what =
    missing.length === 1 ? `Le falta el ${missing.join('')}` : `Le faltan ${joinWords(missing)}`;
  return {
    figure: `${String(done)} de ${String(steps.length)}`,
    alarm: false,
    label: 'pasos de su registro',
    badge: null,
    text: `Ya entró y está completando su registro. ${what}; al aceptar queda Activo.`,
    action: null,
  };
}

function owedLabel(guest: GuestDetail, count: number): string {
  if (guest.type === 'CONTRACT')
    return count === 1 ? '1 mes por pagar' : `${String(count)} meses por pagar`;
  return count === 1 ? '1 estadía por pagar' : `${String(count)} estadías por pagar`;
}

export const INACTIVE_PANEL_TEXT =
  'No puede entrar a Quipu. Sus datos y su historial se conservan.';

/** 4 and 5: an inactive guest, with what it owes first (RN-35) or ready to come back (CU-28). */
function inactivePanel(guest: GuestDetail, owed: readonly Charge[]): DetailPanel {
  if (owed.length === 0) {
    const action: PanelAction = { kind: 'reactivate', label: 'Reactivar huésped' };
    return {
      figure: 'Inactivo',
      alarm: false,
      label: '',
      badge: null,
      text: INACTIVE_PANEL_TEXT,
      action,
    };
  }
  const deactivatedAt = guest.status === 'INACTIVE' ? (guest.deactivatedAt ?? null) : null;
  const day = deactivatedAt === null ? null : limaDay(deactivatedAt);
  const since =
    day === null
      ? 'Su cuenta está inactiva.'
      : `Su cuenta está inactiva desde el ${formatDate(day)}.`;
  const what = joinWords(owed.map((charge) => charge.inSentence));
  return {
    figure: total(owed),
    alarm: true,
    label: owedLabel(guest, owed.length),
    badge: null,
    text: `${since} Para reactivarla, primero salda ${what} con un pago directo.`,
    action: { kind: 'link', ...registerPayment(guest.id) },
  };
}

/** 6 and 7: what it owes, its rejected payment first (it is corrected, not paid again, RN-15). */
function debtPanel(guestId: string, owed: readonly Charge[]): DetailPanel {
  const base = {
    figure: total(owed),
    alarm: true,
    label: 'por pagar',
    badge: PERIOD_BADGES.OVERDUE,
  };
  const rejected = owed.filter((charge) => charge.paymentId !== null).at(-1);
  if (rejected?.paymentId) {
    const reason = rejected.rejectionReason ? ` («${rejected.rejectionReason}»)` : '';
    return {
      ...base,
      text: `${rejected.title}: venció el ${dayMonth(rejected.dueDate)} y su pago fue rechazado${reason}. Corrígelo o agrega lo que falte en la revisión del pago.`,
      action: { kind: 'link', ...openPayment('Corregir pago', rejected.paymentId) },
    };
  }
  const first = owed[0];
  const titles = joinWords(owed.map((charge) => charge.title));
  return {
    ...base,
    text: `${titles}: venció el ${first ? dayMonth(first.dueDate) : ''}. Si te pagó en persona, regístralo como pago directo.`,
    action: { kind: 'link', ...registerPayment(guestId) },
  };
}

/** A rejected payment still before its due date (and grace): it is corrected, not paid again. */
function rejectedPanel(rejected: Charge & { readonly paymentId: string }): DetailPanel {
  const reason = rejected.rejectionReason ? ` («${rejected.rejectionReason}»)` : '';
  return {
    figure: formatMoney(rejected.amountDue),
    alarm: false,
    label: 'por pagar',
    badge: PERIOD_BADGES.UNPAID,
    text: `${rejected.title}: vence el ${dayMonth(rejected.dueDate)} y su pago fue rechazado${reason}. Corrígelo o agrega lo que falte en la revisión del pago.`,
    action: { kind: 'link', ...openPayment('Corregir pago', rejected.paymentId) },
  };
}

function isRejected(charge: Charge): charge is Charge & { readonly paymentId: string } {
  return charge.state === 'UNPAID' && charge.paymentId !== null;
}

/** 8: a payment waiting for its review, the oldest one. */
function reviewPanel(guest: GuestDetail, waiting: readonly Charge[], now: Date): DetailPanel {
  const oldest = waiting[0];
  const sent = guest.paymentHistory.find((payment) => payment.id === oldest?.paymentId);
  const when = sent ? daysAgo(sent.submittedAt, now) : null;
  const action: PanelAction | null = oldest?.paymentId
    ? { kind: 'link', ...openPayment('Revisar pago', oldest.paymentId) }
    : null;
  return {
    figure: total(waiting),
    alarm: false,
    label: 'por revisar',
    badge: PERIOD_BADGES.UNDER_REVIEW,
    text: `${oldest?.title ?? ''}: envió su pago${when === null ? '' : ` ${when}`}.`,
    action,
  };
}

export const NO_CONTRACT_TEXT =
  'Su cuenta está activa, pero aún no tiene contrato: cárgalo para empezar a cobrarle.';

/** 9 and 10: nothing owed nor waiting. */
function quietPanel(guest: GuestDetail, charges: readonly Charge[]): DetailPanel {
  if (guest.type === 'CONTRACT' && guest.contract?.status !== 'ACTIVE') {
    // TODO(TAR-211): «Cargar contrato» once the contracts screen exists.
    return {
      figure: 'Sin contrato',
      alarm: false,
      label: '',
      badge: null,
      text: NO_CONTRACT_TEXT,
      action: null,
    };
  }
  const paid = charges.filter((charge) => charge.state === 'PAID').at(-1);
  const what = paid === undefined ? '' : `: pagó ${paid.paidText}`;
  // A charge not yet due is not owed, but the panel does not say that nothing is left.
  const next = charges.find((charge) => charge.state === 'UNPAID');
  const after =
    next === undefined
      ? 'No hay nada por hacer.'
      : `${next.title} vence el ${dayMonth(next.dueDate)}.`;
  return {
    figure: '0',
    alarm: false,
    label: guest.type === 'CONTRACT' ? 'meses por pagar' : 'estadías por pagar',
    badge: null,
    text: `Está al día${what}. ${after}`,
    action: null,
  };
}

/** What comes first for this guest, in the order of the canvas. */
export function detailPanel(input: PanelInput): DetailPanel {
  const { guest, now } = input;
  if (guest.status === 'PENDING_ACTIVATION') return accessPanel(guest, now, input.reactivated);
  if (guest.status === 'ONBOARDING') return onboardingPanel(guest);
  const charges = chargesOf(input);
  const owed = charges.filter((charge) => charge.state === 'OVERDUE');
  if (guest.status === 'INACTIVE') return inactivePanel(guest, owed);
  if (owed.length > 0) return debtPanel(guest.id, owed);
  const rejected = charges.filter(isRejected).at(-1);
  if (rejected) return rejectedPanel(rejected);
  const waiting = charges.filter((charge) => charge.state === 'UNDER_REVIEW');
  if (waiting.length > 0) return reviewPanel(guest, waiting, now);
  return quietPanel(guest, charges);
}

/** Whether the guest owes anything (the hint of «Reactivar huésped»). */
export function owesAnything(input: Pick<PanelInput, 'guest' | 'periods' | 'stays'>): boolean {
  return chargesOf({ ...input, now: new Date(), reactivated: false }).some(
    (charge) => charge.state === 'OVERDUE',
  );
}
