import type { components } from '@core/api/bff.generated';
import type { NoticeTone } from '@shared/ui/page-notice/page-notice.component';
import {
  formatDateTime,
  formatMoney,
  formatPeriod,
  formatStay,
  parseAmount,
} from '@shared/payments/payment-format';
import type { Balance } from '@shared/payments/payment-format';
import { fileMeta } from '@shared/text/file-text';

/** A5.2 «Revisar pago», as the canvas words it (Revision), Spanish only (QP-ANGWEB-LNG-01). */

// Every type comes from the contract (TAR-23).
type PaymentDetail = components['schemas']['Payment'];
type AdminProof = components['schemas']['AdminProof'];
type PaymentSurplus = components['schemas']['PaymentSurplus'];
type ProofEdit = components['schemas']['ProofEdit'];

export const LOAD_ERROR_TEXT = 'No se pudo cargar este pago.';

/** How the viewer shows a proof: the image, a PDF to download, cash, or a file it cannot open. */
export type ProofView = 'image' | 'pdf' | 'cash' | 'missing';

/** One proof as the picker, the viewer and the amounts table of A5.2 show it. */
export interface ProofEntry {
  readonly id: string;
  /** «Voucher 1», «Voucher 2», «Efectivo». */
  readonly title: string;
  /** The declared amount, under the title in the picker. */
  readonly declared: string;
  /** «Yape», «Transferencia»; null when it has none. */
  readonly method: string | null;
  readonly view: ProofView;
  /** The signed URL of the file (15 minutes, it forces the download); null for cash. */
  readonly url: string | null;
  readonly fileName: string | null;
  /** «Imagen JPG · 1.4 MB», «PDF · 240 KB». */
  readonly fileMeta: string | null;
  /** «Subido por el huésped» or «Agregado por la administración». */
  readonly by: string;
  readonly byAdmin: boolean;
  /** «el 26 oct 2026, 09:14». */
  readonly added: string;
  /** The amount the administration verified, once decided; null before. */
  readonly verified: string | null;
  /** The verified amount differs from the declared one («Corregido»). */
  readonly corrected: boolean;
}

function viewOf(proof: AdminProof): ProofView {
  if (proof.kind === 'CASH') return 'cash';
  if (proof.fileUrl === null) return 'missing';
  return proof.file?.contentType === 'application/pdf' ? 'pdf' : 'image';
}

/** The proofs in the order they came, each voucher and each cash numbered within its kind. */
export function proofEntries(proofs: readonly AdminProof[]): ProofEntry[] {
  const totals = { VOUCHER: 0, CASH: 0 };
  for (const proof of proofs) totals[proof.kind] += 1;
  const seen = { VOUCHER: 0, CASH: 0 };
  return proofs.map((proof) => {
    seen[proof.kind] += 1;
    const name = proof.kind === 'VOUCHER' ? 'Voucher' : 'Efectivo';
    const file = proof.file ?? null;
    return {
      id: proof.id,
      title: totals[proof.kind] > 1 ? `${name} ${String(seen[proof.kind])}` : name,
      declared: formatMoney(proof.declaredAmount),
      method: proof.method ?? null,
      view: viewOf(proof),
      url: proof.fileUrl,
      fileName: file?.name ?? null,
      fileMeta: file ? fileMeta(file.contentType, file.sizeBytes) : null,
      by: proof.uploadedBy === 'ADMIN' ? 'Agregado por la administración' : 'Subido por el huésped',
      byAdmin: proof.uploadedBy === 'ADMIN',
      added: `el ${formatDateTime(proof.addedAt)}`,
      verified: proof.verifiedAmount === null ? null : formatMoney(proof.verifiedAmount),
      corrected: proof.verifiedAmount !== null && proof.verifiedAmount !== proof.declaredAmount,
    };
  });
}

/** «Lo que se está pagando»: who, where, which month or stay and what is due. */
export interface PayingFacts {
  readonly name: string | null;
  readonly document: string;
  readonly type: string;
  readonly environment: string;
  readonly whatLabel: string;
  readonly what: string;
  readonly dueLabel: string;
  readonly due: string;
  /** «Cuota S/ 650.00 − crédito a favor S/ 40.00», only when a credit is applied (RN-38). */
  readonly creditNote: string | null;
}

export function payingFacts(payment: PaymentDetail): PayingFacts {
  const stay = payment.guestType === 'TEMPORARY';
  const what =
    payment.period !== null
      ? formatPeriod(payment.period)
      : payment.stayStartDate !== null && payment.stayEndDate !== null
        ? formatStay(payment.stayStartDate, payment.stayEndDate)
        : '—';
  const base = stay ? 'Acordado' : 'Cuota';
  return {
    name: payment.guestName,
    document: payment.documentNumber,
    type: stay ? 'Temporal' : 'Contrato',
    environment: payment.environmentCode ?? '—',
    whatLabel: stay ? 'Estadía' : 'Mes',
    what,
    dueLabel: payment.creditApplied > 0 ? 'Por pagar' : base,
    due: formatMoney(payment.amountDue),
    creditNote:
      payment.creditApplied > 0
        ? `${base} ${formatMoney(payment.expectedAmount)} − crédito a favor ${formatMoney(payment.creditApplied)} (RN-38).`
        : null,
  };
}

/** The sum of the verified amounts typed so far; a text that is not an amount adds nothing. */
export function verifiedTotal(
  proofs: readonly AdminProof[],
  texts: Readonly<Record<string, string>>,
): number {
  return proofs.reduce((sum, proof) => sum + (parseAmount(texts[proof.id] ?? '') ?? 0), 0);
}

/** The balance under the amounts: its tone, the key phrase and what follows from it. */
export interface BalanceNotice {
  readonly tone: NoticeTone;
  readonly heading: string;
  readonly text: string;
}

/** Completo, Faltan or Sobran while deciding, with where the surplus goes (RN-16, RN-38, RN-39). */
export function balanceNotice(balance: Balance, stay: boolean): BalanceNotice {
  switch (balance.kind) {
    case 'complete':
      return {
        tone: 'success',
        heading: 'Completo.',
        text: `Lo verificado cubre ${stay ? 'el monto acordado' : 'la cuota'}.`,
      };
    case 'short':
      return {
        tone: 'error',
        heading: `Faltan ${formatMoney(balance.difference)}.`,
        text: 'No se puede aprobar: agrega el comprobante que falta o recházalo con un motivo.',
      };
    case 'over':
      return {
        tone: 'info',
        heading: `Sobran ${formatMoney(balance.difference)}.`,
        text: balance.refund
          ? 'Es el último período: al aprobar queda una devolución por registrar en Finanzas.'
          : 'Al aprobar quedan como crédito para el mes siguiente.',
      };
  }
}

const SURPLUS_TEXTS: Readonly<Record<PaymentSurplus['outcome'], string>> = {
  CREDIT: 'Quedó como crédito del mes siguiente.',
  REFUND_PENDING: 'Devolución pendiente: regístrala en Finanzas.',
  REFUNDED: 'Ya se devolvió.',
};

/** The balance of an approved payment, by what the BFF saved. */
export function approvedNotice(surplus: PaymentSurplus | null | undefined): BalanceNotice {
  if (surplus && surplus.amount > 0) {
    return {
      tone: 'info',
      heading: `Sobraron ${formatMoney(surplus.amount)}.`,
      text: SURPLUS_TEXTS[surplus.outcome],
    };
  }
  return {
    tone: 'success',
    heading: 'Completo.',
    text: 'Lo verificado cubrió lo que correspondía.',
  };
}

/** «Aprobado el 3 oct 2026, 20:11 por Rosa Quispe.» */
export function resolvedText(
  status: 'APPROVED' | 'REJECTED',
  reviewedAt: string | null | undefined,
  reviewer: string | null | undefined,
): string {
  const verb = status === 'APPROVED' ? 'Aprobado' : 'Rechazado';
  const when = reviewedAt ? ` el ${formatDateTime(reviewedAt)}` : '';
  const who = reviewer ? ` por ${reviewer}` : '';
  return `${verb}${when}${who}.`;
}

/** Why «Aprobar pago» cannot be pressed, or what approving does. */
export function decisionHelp(balance: Balance | null, unseenVoucher: boolean): string {
  if (unseenVoucher) return 'Para aprobar, primero tienes que ver los vouchers.';
  if (balance?.kind === 'short') {
    return 'Un pago que no cubre lo que corresponde no se aprueba: recházalo con el motivo y el huésped lo corrige.';
  }
  return 'Al aprobar, el pago queda registrado con los montos verificados.';
}

/** A button of a conflict notice (the shape the shared notice dialog takes). */
interface NoticeAction {
  readonly label: string;
  readonly value: string;
}

/** What the page needs of a proof added in the dialog. */
export interface AddedProofLike {
  readonly kind: ProofEdit['kind'];
  readonly amount: number;
  readonly method?: string;
  readonly file?: unknown;
}

export type LoadState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready' }
  | { readonly kind: 'not-found' }
  | { readonly kind: 'error'; readonly message: string };

export type Outcome = 'APPROVED' | 'REJECTED';

export interface Notice {
  readonly title: string;
  readonly text: string;
  readonly actions: readonly NoticeAction[];
}

const BACK: NoticeAction = { label: 'Volver a Pagos', value: 'back' };
const OK: NoticeAction = { label: 'Entendido', value: 'ok' };

/** The conflicts the SRS shows as a modal, with the BFF's own message (QP-UI-17). */
export const NOTICES: Readonly<Partial<Record<string, Notice>>> = {
  PAYMENT_ALREADY_RESOLVED: {
    title: 'Este pago ya se resolvió',
    text: 'Este pago ya fue resuelto por otro proceso',
    actions: [BACK],
  },
  PAYMENT_ALREADY_EXISTS_FOR_PERIOD: {
    title: 'Ya hay un pago aprobado',
    text: 'Ya existe un pago aprobado para este período',
    actions: [OK],
  },
  PAYMENT_PERIOD_NOT_PAYABLE: {
    title: 'Este mes ya no se cobra',
    text: 'Este mes ya no se cobra: el contrato terminó antes de aprobar este pago. Recházalo con un motivo para que el huésped lo sepa.',
    actions: [
      { label: 'Rechazar con motivo', value: 'reject' },
      { label: 'Cancelar', value: 'cancel' },
    ],
  },
  PAYMENT_NOT_CORRECTABLE: {
    title: 'Este pago ya no se puede corregir',
    text: 'Este pago ya no se puede corregir: está en revisión o ya se aprobó',
    actions: [OK],
  },
};

/** The text of each verified amount, kept while the page reloads after adding a proof. */
export function amountTexts(
  proofs: readonly AdminProof[],
  current: Readonly<Record<string, string>>,
): Record<string, string> {
  return Object.fromEntries(
    proofs.map((proof) => [
      proof.id,
      current[proof.id] ?? String(proof.verifiedAmount ?? proof.declaredAmount),
    ]),
  );
}

/** A proof that stays as it is in a correction (the contract replaces the whole set). */
export function kept(proof: AdminProof): ProofEdit {
  const method = proof.method?.trim();
  return {
    id: proof.id,
    kind: proof.kind,
    amount: proof.declaredAmount,
    ...(method ? { method } : {}),
  };
}

export function added(proof: AddedProofLike): ProofEdit {
  const base: ProofEdit = { kind: proof.kind, amount: proof.amount };
  return {
    ...base,
    ...(proof.method ? { method: proof.method } : {}),
    ...(proof.file ? { fileIndex: 0 } : {}),
  };
}
