import {
  daysFromToday,
  formatDate,
  formatMoney,
  formatPeriod,
} from '@shared/payments/payment-format';
import type { PeriodItem, PeriodRow, StateBadge } from '@shared/payments/period-rows';
import { documentLabel } from '@shared/text/document-text';
import { fileMeta, uploadedText } from '@shared/text/file-text';
import { environmentLabel } from '@shared/text/environment-text';
import { guestName } from '@shared/text/guest-text';
import { STATE_BADGES, stateOf } from './contract';
import type { Contract, ContractState } from './contract';
import { rangeText } from './contract';
import { graceText } from './contract-form';
import type { FormFact } from './contract-form';

/** A4.2 «Detalle del contrato» (CU-07) and A4.3 «Finalizar» (CU-12) as the canvas «ContratoDetalle» words it. */

export const LOAD_ERROR_TEXT = 'No se pudo cargar el contrato.';
export const NOT_FOUND_TEXT = 'No se encontró el contrato.';
export const TERMINATED_TEXT = 'Contrato finalizado.';
export const FILE_ERROR_TEXT = 'No se pudo acceder al archivo; inténtalo de nuevo más tarde.';

/** The months this contract charges, among the months of the guest (RF-06). */
export function ownPeriods(periods: readonly PeriodItem[], contractId: string): PeriodItem[] {
  return periods.filter((period) => period.contractId === contractId);
}

/** Where the action of the panel goes. */
export interface PanelAction {
  readonly label: string;
  readonly link: readonly string[];
  readonly query: Readonly<Record<string, string>> | null;
}

/** «Lo que toca ahora» of the contract: the debt first, then the review, then the end. */
export interface DetailPanel {
  readonly figure: string;
  readonly label: string;
  readonly text: string;
  /** The figure goes in red ink: the thing that waits is late. */
  readonly urgent: boolean;
  readonly badge: StateBadge | null;
  readonly action: PanelAction | null;
}

const DAY_MS = 86_400_000;

/** The day after an ISO date, yyyy-mm-dd. */
function nextDay(isoDate: string): string {
  return new Date(Date.parse(isoDate) + DAY_MS).toISOString().slice(0, 10);
}

function shortDate(isoDate: string): string {
  return formatDate(isoDate).replace(/ \d{4}$/, '');
}

function firstName(name: string | null): string {
  return guestName(name).split(' ')[0] ?? '';
}

function lower(label: string): string {
  return label.toLowerCase();
}

/** «Octubre 2026» for one, «Septiembre y octubre de 2026» for several of the same year. */
function owedMonths(owed: readonly PeriodRow[]): string {
  const [first] = owed;
  if (first === undefined) return '';
  if (owed.length === 1) return first.month;
  const names = owed.map((row, index) => {
    const name = row.month.split(' ')[0] ?? '';
    return index === 0 ? name : lower(name);
  });
  return `${names.join(' y ')} de ${first.month.split(' ')[1] ?? ''}`;
}

const REGISTER_PAYMENT = 'Registrar pago';

/** What a panel has when nothing waits on the contract: no badge and no action. */
const CALM = { urgent: false, badge: null, action: null } as const;

function isOwed(row: PeriodRow): boolean {
  return row.state === 'OVERDUE' || row.state === 'UNPAID';
}

/** The debt: its figure in red and the way to register the payment in person. */
function owedPanel(contract: Contract, owed: readonly PeriodRow[], first: PeriodRow): DetailPanel {
  const total = owed.reduce((sum, row) => sum + row.amountDue, 0);
  const ending =
    contract.status === 'ACTIVE'
      ? 'Si te pagó en persona, regístralo como pago directo.'
      : 'Finalizar el contrato no borra la deuda: sigue hasta que la pague.';
  return {
    figure: formatMoney(total),
    label: 'por pagar',
    text: `${owedMonths(owed)}: venció el ${shortDate(first.dueDate)}. ${ending}`,
    urgent: true,
    badge: first.badge,
    action: {
      label: REGISTER_PAYMENT,
      link: ['/admin/payments/new'],
      query: { guestId: contract.guestId },
    },
  };
}

function reviewPanel(contract: Contract, review: PeriodRow): DetailPanel {
  return {
    figure: formatMoney(review.amountDue),
    label: 'por revisar',
    text: `${review.month}: ${firstName(contract.guestName)} subió su voucher.`,
    urgent: false,
    badge: review.badge,
    action: review.action,
  };
}

/** A contract that is over, finalized or expired: its environment is free and its payments stay. */
function endedPanel(contract: Contract, environment: string): DetailPanel {
  if (contract.status === 'TERMINATED') {
    const day = contract.terminatedAt ? formatDate(contract.terminatedAt) : '';
    return {
      ...CALM,
      figure: 'Finalizado',
      label: '',
      text: `Lo finalizaste el ${day}. La ${environment} quedó libre y sus pagos se conservan.`,
    };
  }
  return {
    ...CALM,
    figure: 'Vencido',
    label: '',
    text: `Venció el ${formatDate(contract.endDate ?? '')} y la ${environment} quedó libre. Pagó todos sus meses; sus pagos se conservan.`,
  };
}

/** A contract about to end: talk to the guest and, to renew it, load the new one from the next day. */
function soonPanel(contract: Contract, endDate: string, days: number, environment: string) {
  const renew = shortDate(nextDay(endDate));
  return {
    figure: `${String(days)} días`,
    label: 'para que venza',
    text: `Vence el ${shortDate(endDate)}. Conversa con ${firstName(contract.guestName)}: para renovarlo, carga el contrato nuevo desde el ${renew}; si no, la ${environment} queda libre al día siguiente.`,
    urgent: false,
    badge: STATE_BADGES.SOON,
    action: {
      label: 'Renovar contrato',
      link: ['/admin/contracts/new'],
      query: { guestId: contract.guestId },
    },
  } satisfies DetailPanel;
}

function upToDatePanel(contract: Contract, rows: readonly PeriodRow[]): DetailPanel {
  const last = rows.at(-1);
  const paid = last === undefined ? 'todo' : lower(formatPeriod(last.period));
  const ending = contract.endDate
    ? `Vence el ${formatDate(contract.endDate)}.`
    : 'No tiene fecha de fin: sigue hasta que lo finalices.';
  return {
    ...CALM,
    figure: '0',
    label: 'meses por pagar',
    text: `Está al día: pagó ${paid}. ${ending}`,
  };
}

export function detailPanel(
  contract: Contract,
  rows: readonly PeriodRow[],
  now: Date,
): DetailPanel {
  const environment = lower(environmentLabel(contract.environmentType, contract.environmentCode));
  const owed = rows.filter(isOwed);
  const [firstOwed] = owed;
  if (firstOwed !== undefined) return owedPanel(contract, owed, firstOwed);
  const review = rows.find((row) => row.state === 'UNDER_REVIEW');
  if (review !== undefined) return reviewPanel(contract, review);
  if (contract.status !== 'ACTIVE') return endedPanel(contract, environment);
  const toStart = daysFromToday(contract.startDate, now);
  if (toStart !== null && toStart > 0) {
    return {
      ...CALM,
      figure: `${String(toStart)} días`,
      label: 'para que empiece',
      text: `Empieza el ${formatDate(contract.startDate)}. La ${environment} ya está ocupada.`,
    };
  }
  const days = contract.endDate ? daysFromToday(contract.endDate, now) : null;
  if (stateOf(contract) === 'SOON' && days !== null && contract.endDate) {
    return soonPanel(contract, contract.endDate, days, environment);
  }
  return upToDatePanel(contract, rows);
}

/** What the contract says about its dates today. */
function validityHint(contract: Contract, now: Date): string | undefined {
  const toStart = daysFromToday(contract.startDate, now);
  const toEnd = contract.endDate ? daysFromToday(contract.endDate, now) : null;
  switch (contract.status) {
    case 'TERMINATED':
      return contract.terminatedAt
        ? `Finalizado el ${formatDate(contract.terminatedAt)}.`
        : undefined;
    case 'EXPIRED':
      return contract.endDate ? `Venció el ${formatDate(contract.endDate)}.` : undefined;
    case 'ACTIVE':
      if (toStart !== null && toStart > 0) return `Empieza en ${String(toStart)} días.`;
      if (!contract.endDate) return 'Sigue hasta que lo finalices.';
      return contract.expiringSoon && toEnd !== null
        ? `Vence en ${String(toEnd)} días.`
        : undefined;
  }
}

/** «Lo acordado»: the terms of the contract, as the guest sees them in H2. */
export function detailFacts(contract: Contract, now: Date): FormFact[] {
  const state: ContractState = stateOf(contract);
  const hint = validityHint(contract, now);
  return [
    {
      label: 'Huésped',
      value: guestName(contract.guestName),
      wide: true,
      hint: documentLabel(contract.documentType, contract.documentNumber),
    },
    {
      label: 'Ambiente',
      value: environmentLabel(contract.environmentType, contract.environmentCode),
      wide: false,
    },
    { label: 'Estado', value: STATE_BADGES[state].label, wide: false },
    { label: 'Cuota mensual', value: formatMoney(contract.monthlyAmount), wide: false },
    {
      label: 'Día de pago',
      value: `${String(contract.paymentDay)} de cada mes`,
      wide: false,
      hint: graceText(contract.paymentDay, contract.graceDays),
    },
    {
      label: 'Vigencia',
      value: rangeText(contract.startDate, contract.endDate),
      wide: true,
      ...(hint === undefined ? {} : { hint }),
    },
  ];
}

/** «PDF · 860 KB · subido el 28 feb 2026»: what the file of the contract is. */
export function fileText(contract: Contract, now: Date): string {
  return `${fileMeta('application/pdf', contract.file.sizeBytes)} · ${uploadedText(contract.file.uploadedAt, now)}`;
}

export const MONTHS_NOTE_ACTIVE =
  'Solo los meses de este contrato, del más reciente al más antiguo.';
export const MONTHS_NOTE_ENDED = 'Solo los meses de este contrato. Ya no se generan meses nuevos.';

export function monthsNote(contract: Contract): string {
  return contract.status === 'ACTIVE' ? MONTHS_NOTE_ACTIVE : MONTHS_NOTE_ENDED;
}

/** The text of an empty list of months: the first one is the month it starts. */
export function noMonthsText(contract: Contract): string {
  const start = new Date(Date.parse(contract.startDate));
  const month = formatPeriod(contract.startDate.slice(0, 7)).split(' ')[0] ?? '';
  const day = start.getUTCDate();
  return `El primer mes es ${month.toLowerCase()}: aparece aquí desde el ${String(day)} ${month.slice(0, 3).toLowerCase()}.`;
}

// A4.3 «Finalizar».

export const confirmTitle = (guest: string | null): string =>
  `¿Finalizar el contrato de ${guestName(guest)}?`;

/** What finalizing does (CU-12, RN-25): the environment is freed, the debt stays and the guest keeps seeing. */
export function confirmPoints(contract: Contract, rows: readonly PeriodRow[]): string[] {
  const environment = lower(environmentLabel(contract.environmentType, contract.environmentCode));
  const owed = rows.filter((row) => row.state === 'OVERDUE' || row.state === 'UNPAID');
  const total = owed.reduce((sum, row) => sum + row.amountDue, 0);
  return [
    `La ${environment} queda libre desde hoy.`,
    owed.length > 0
      ? `Sigue debiendo ${owedMonths(owed).toLowerCase()} (${formatMoney(total)}) hasta que lo pague.`
      : 'Está al día: no queda nada por cobrar.',
    `${firstName(contract.guestName)} podrá entrar a Quipu solo para ver sus pagos y este contrato.`,
  ];
}
