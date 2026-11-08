import type { components } from '@core/api/bff.generated';
import {
  daysFromToday,
  formatDate,
  formatMoney,
  limaDayOf,
  longDay,
  monthName,
} from '@shared/payments/payment-format';
import { environmentLabel } from '@shared/text/environment-text';
import { fileSize } from '@shared/text/file-text';
import type { NoticeTone } from '@shared/ui/page-notice/page-notice.component';
import type { StatusTone } from '@shared/ui/status-badge/status-badge.component';

type Contract = components['schemas']['Contract'];
type PeriodStatus = components['schemas']['PeriodStatus'];

/** H2 «Mi contrato» (CU-18, RN-26), as the canvas «MiContrato» words it. Spanish only. */

export const CONTRACT_TITLE = 'Mi contrato';
export const LOAD_CONTRACT_TEXT = 'No se pudo cargar tu contrato.';
export const NO_CONTRACT_TITLE = 'Aún no tienes un contrato cargado.';
export const NO_CONTRACT_TEXT =
  'Cuando la administración lo cargue, aquí verás sus fechas, tu cuota y el documento.';
export const FILE_LINK_NOTE =
  'Se abre en otra pestaña. El enlace dura 15 minutos; si vence, vuelve a pulsar «Ver contrato».';
export const LINK_EXPIRED_TEXT =
  'El enlace venció: ya hay uno nuevo, pulsa «Ver contrato» otra vez.';
/** The links last 15 minutes (RN-37); the page asks again a little before. */
export const LINK_LIFETIME_MS = 14 * 60 * 1000;

export interface ContractFact {
  readonly label: string;
  readonly value: string;
  readonly hint: string;
}

export interface ContractNotice {
  readonly tone: NoticeTone;
  readonly heading: string;
  readonly text: string;
  /** Offers «Ver estado de cuenta» (a debt remains). */
  readonly accountLink: boolean;
}

export interface ContractFile {
  readonly name: string;
  /** «PDF · 860 KB · cargado el 28 de febrero». */
  readonly meta: string;
  /** The signed link; null when the storage could not sign it. */
  readonly url: string | null;
}

/** Everything one contract shows: its state, the notice, its facts and its file. */
export interface ContractBlock {
  readonly state: { readonly tone: StatusTone; readonly label: string };
  readonly text: string;
  readonly notice: ContractNotice | null;
  readonly facts: readonly ContractFact[];
  readonly file: ContractFile;
}

/** What the screen knows besides the contract itself. */
export interface ContractContext {
  readonly now: Date;
  /** The months of the account (H1), to know what is still owed and when the first payment is due. */
  readonly periods: readonly PeriodStatus[];
}

const OWED = new Set<PeriodStatus['status']>(['UNPAID', 'OVERDUE']);

/** «hoy», «mañana», «en 30 días», «en 4 meses». */
function untilText(days: number): string {
  if (days <= 0) return 'hoy';
  if (days === 1) return 'mañana';
  return days <= 45 ? `en ${String(days)} días` : `en ${String(Math.round(days / 30))} meses`;
}

function stateOf(contract: Contract): ContractBlock['state'] {
  if (contract.status === 'TERMINATED') return { tone: 'unpaid', label: 'Finalizado' };
  if (contract.status === 'EXPIRED') return { tone: 'unpaid', label: 'Vencido' };
  return contract.expiringSoon
    ? { tone: 'review', label: 'Próximo a vencer' }
    : { tone: 'paid', label: 'Vigente' };
}

function firstDue(contract: Contract, periods: readonly PeriodStatus[]): string | null {
  return periods.find((period) => period.contractId === contract.id)?.dueDate ?? null;
}

function stateText(contract: Contract, { now, periods }: ContractContext): string {
  if (contract.status === 'TERMINATED') {
    const day = limaDayOf(contract.terminatedAt ?? '');
    return day === null
      ? 'La administración lo finalizó.'
      : `La administración lo finalizó el ${longDay(day, now)}.`;
  }
  const end = contract.endDate ?? null;
  if (contract.status === 'EXPIRED') {
    return end === null ? 'Terminó.' : `Terminó el ${longDay(end, now)}.`;
  }
  const toStart = daysFromToday(contract.startDate, now);
  if (toStart !== null && toStart > 0) {
    const due = firstDue(contract, periods);
    const first = due === null ? '' : ` Tu primer pago vence el ${longDay(due, now)}.`;
    return `Empieza el ${longDay(contract.startDate, now)}, ${untilText(toStart)}.${first}`;
  }
  if (end === null) {
    return 'No tiene fecha de fin: sigue hasta que tú o la administración lo terminen.';
  }
  const toEnd = daysFromToday(end, now);
  const when = toEnd === null ? '' : `, ${untilText(toEnd)}`;
  return `Vence el ${longDay(end, now)}${when}.`;
}

/** What is still owed on this contract, as «octubre y noviembre» and the total; null when nothing. */
function owed(contract: Contract, periods: readonly PeriodStatus[]) {
  const months = periods.filter((p) => p.contractId === contract.id && OWED.has(p.status));
  if (months.length === 0) return null;
  const names = months.map((p) => monthName(p.period) ?? p.period);
  const total = months.reduce((sum, p) => sum + p.amountDue, 0);
  const list =
    names.length === 1
      ? (names[0] ?? '')
      : `${names.slice(0, -1).join(', ')} y ${names.at(-1) ?? ''}`;
  return { list, total };
}

function noticeOf(
  contract: Contract,
  next: Contract | null,
  context: ContractContext,
): ContractNotice | null {
  const { now, periods } = context;
  if (contract.status !== 'ACTIVE') {
    const debt = owed(contract, periods);
    if (debt !== null) {
      return {
        tone: 'error',
        heading: `Quedó por pagar ${debt.list}: ${formatMoney(debt.total)}.`,
        text: 'Coordina el pago con la administración.',
        accountLink: true,
      };
    }
    return {
      tone: 'info',
      heading: 'Puedes seguir entrando.',
      text: 'Tu cuenta queda en solo lectura para que veas tus pagos y este contrato.',
      accountLink: false,
    };
  }
  if (next !== null) {
    return {
      tone: 'success',
      heading: 'Tu renovación ya está cargada.',
      text: `Empieza el ${longDay(next.startDate, now)}; la ves abajo, en Tu próximo contrato.`,
      accountLink: false,
    };
  }
  if (contract.expiringSoon && contract.endDate) {
    return {
      tone: 'info',
      heading: '¿Quieres seguir?',
      text: `Habla con la administración antes del ${longDay(contract.endDate, now)} para renovar.`,
      accountLink: false,
    };
  }
  return null;
}

function paymentHint(day: number, grace: number): string {
  // Past the 28th a month may be shorter (RN-10): the date alone would be wrong.
  if (day + grace > 28 || (grace === 0 && day >= 28)) {
    return grace > 0
      ? `Tienes ${daysText(grace)} de gracia desde el día de pago.`
      : 'Cuenta como atrasado desde el día siguiente al de pago.';
  }
  return grace > 0
    ? `Sin atraso hasta el ${String(day + grace)}.`
    : `Desde el ${String(day + 1)} cuenta como atrasado.`;
}

function daysText(count: number): string {
  return count === 1 ? '1 día' : `${String(count)} días`;
}

function factsOf(contract: Contract, before: Contract | null): ContractFact[] {
  const grace = contract.graceDays;
  const raised = before !== null && before.monthlyAmount !== contract.monthlyAmount;
  return [
    {
      label: 'Ambiente',
      value: environmentLabel(contract.environmentType, contract.environmentCode),
      hint: '',
    },
    {
      label: 'Cuota mensual',
      value: formatMoney(contract.monthlyAmount),
      hint: raised ? `Antes ${formatMoney(before.monthlyAmount)}.` : '',
    },
    {
      label: 'Día de pago',
      value: `${String(contract.paymentDay)} de cada mes`,
      hint: paymentHint(contract.paymentDay, grace),
    },
    { label: 'Días de gracia', value: grace > 0 ? daysText(grace) : 'Ninguno', hint: '' },
    { label: 'Desde', value: formatDate(contract.startDate), hint: '' },
    {
      label: 'Hasta',
      value: contract.endDate ? formatDate(contract.endDate) : 'Sin fecha de fin',
      hint: '',
    },
  ];
}

function fileOf(contract: Contract, now: Date): ContractFile {
  const day = limaDayOf(contract.file.uploadedAt);
  const loaded = day === null ? '' : ` · cargado el ${longDay(day, now)}`;
  return {
    name: contract.file.name,
    // A contract file is always a PDF (RF-15).
    meta: `PDF · ${fileSize(contract.file.sizeBytes)}${loaded}`,
    url: contract.fileUrl,
  };
}

/** The contract in force (or the latest), with its notice and what is owed if it ended. */
export function currentBlock(
  contract: Contract,
  next: Contract | null,
  context: ContractContext,
): ContractBlock {
  return {
    state: stateOf(contract),
    text: stateText(contract, context),
    notice: noticeOf(contract, next, context),
    facts: factsOf(contract, null),
    file: fileOf(contract, context.now),
  };
}

/** «Tu próximo contrato»: the renewal already loaded, compared with the one in force (RN-20). */
export function nextBlock(
  next: Contract,
  current: Contract,
  context: ContractContext,
): ContractBlock {
  return {
    state: { tone: 'paid', label: 'Vigente' },
    text: `Empieza el ${longDay(next.startDate, context.now, true)}.`,
    notice: null,
    facts: factsOf(next, current),
    file: fileOf(next, context.now),
  };
}

/** Whether a signed link loaded at `loadedAt` may already be dead (they last 15 minutes). */
export function isLinkStale(loadedAt: number, now: number): boolean {
  return now - loadedAt >= LINK_LIFETIME_MS;
}
