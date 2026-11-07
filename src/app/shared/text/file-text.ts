import { formatDate, limaDayOf } from '../payments/payment-format';

/** How a file is named for people (vouchers of A5.2, documents of A3.8): its kind and its size. */

const FILE_KINDS: Readonly<Record<string, string>> = {
  'image/jpeg': 'Imagen JPG',
  'image/png': 'Imagen PNG',
  'application/pdf': 'PDF',
};

/** «1.4 MB», «240 KB». */
export function fileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${String(Math.max(1, Math.round(bytes / 1024)))} KB`;
}

/** «Imagen JPG · 1.4 MB», «PDF · 240 KB». */
export function fileMeta(contentType: string, sizeBytes: number): string {
  return `${FILE_KINDS[contentType] ?? 'Archivo'} · ${fileSize(sizeBytes)}`;
}

/** «subido hoy» or «subido el 2 mar 2026», by days in Lima; «subido» when the instant is not valid. */
export function uploadedText(uploadedAt: string, now: Date): string {
  const day = limaDayOf(uploadedAt);
  if (day === null) return 'subido';
  return day === limaDayOf(now.toISOString()) ? 'subido hoy' : `subido el ${formatDate(day)}`;
}
