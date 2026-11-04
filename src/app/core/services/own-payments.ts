import { Observable } from 'rxjs';
import type { components } from '@core/api/bff.generated';

// Every type comes from the contract (TAR-23).
export type GuestPayment = components['schemas']['GuestPayment'];
export type GuestProof = components['schemas']['GuestProof'];
export type OwnProofInput = components['schemas']['ProofInput'];
export type OwnProofEdit = components['schemas']['ProofEdit'];
export type OwnPaymentSummary = components['schemas']['PaymentSummary'];

/**
 * What H3 (guest with a contract) and T2 (temporary guest) share: their own payment, read and
 * corrected by id. The guest is always the one of the session; no guest id ever travels.
 */
export interface OwnPaymentsApi {
  get(id: string): Observable<GuestPayment>;
  /** Replaces the whole set of proofs of a rejected payment and sends it again (RN-05). */
  correct(
    id: string,
    proofs: readonly OwnProofEdit[],
    files: readonly File[],
  ): Observable<OwnPaymentSummary>;
}

/**
 * The multipart body of a payment of the guest (GuestPaymentUpload, StayPaymentUpload,
 * ProofsCorrection): the plain `fields` first, then the proofs as a JSON part and the voucher files
 * in the order their `fileIndex` points to.
 */
export function proofsBody(
  proofs: readonly (OwnProofInput | OwnProofEdit)[],
  files: readonly File[],
  fields: Readonly<Record<string, string>> = {},
): FormData {
  const body = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    body.append(name, value);
  }
  body.append('proofs', new Blob([JSON.stringify(proofs)], { type: 'application/json' }));
  for (const file of files) {
    body.append('files', file, file.name);
  }
  return body;
}

/** The path of one payment under `base`; ids are opaque and only escaped for the URL. */
export function paymentUrl(base: string, id: string): string {
  return `${base}/${encodeURIComponent(id)}`;
}
