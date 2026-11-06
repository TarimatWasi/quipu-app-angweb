/**
 * Rules and texts every payment form shares (A5.1, A5.2, H3, T2). A plain file, so that a page
 * that only needs a rule does not pull another page's component into its chunk.
 */

/** RN-22: a payment gathers from one to five proofs. */
export const MAX_PROOFS = 5;

export const PAYMENT_METHOD_SHORTCUTS = ['Yape', 'Transferencia'] as const;

/** RF-15: JPG, PNG or PDF of 5 MB at most; the BFF checks them again by content. */
export const VOUCHER_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'application/pdf'];
export const VOUCHER_MAX_BYTES = 5 * 1024 * 1024;
export const INVALID_FILE_TEXT = 'Archivo inválido — sube JPG, PNG o PDF de máx. 5MB';
export const AMOUNT_TEXT = 'El monto debe ser mayor a 0';
export const MISSING_FILE_TEXT = 'Sube el archivo del voucher';
export const PERIOD_TEXT = 'Elige el período';

/** Whether a chosen file can be a voucher: its type and size (RF-15). */
export function isValidVoucher(file: File): boolean {
  return VOUCHER_TYPES.includes(file.type) && file.size <= VOUCHER_MAX_BYTES;
}
