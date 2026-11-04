import type { components } from '@core/api/bff.generated';
import { invalid, raise } from './mock-reply';

type ProofEdit = components['schemas']['ProofEdit'];
type ProofFileInfo = components['schemas']['ProofFileInfo'];

/** A multipart upload as the simulated BFF keeps it: only the file's name, type and size. */
export interface ProofsUpload {
  readonly proofs: readonly ProofEdit[];
  readonly files: readonly ProofFileInfo[];
  readonly field: (name: string) => string | null;
}

const MAX_PROOFS = 5;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const FILE_TYPES = new Set<string>(['image/jpeg', 'image/png', 'application/pdf']);

function isFileType(type: string): type is ProofFileInfo['contentType'] {
  return FILE_TYPES.has(type);
}

function fileInfo(file: File, index: number): ProofFileInfo {
  if (!isFileType(file.type) || file.size > MAX_FILE_BYTES) {
    raise(
      400,
      'VOUCHER_INVALID_FILE',
      'El archivo debe ser JPG, PNG o PDF y pesar 5 MB como máximo.',
      `files[${String(index)}]`,
    );
  }
  return { name: file.name, contentType: file.type, sizeBytes: file.size };
}

async function proofsOf(part: FormDataEntryValue | null): Promise<ProofEdit[]> {
  const text = part instanceof Blob ? await part.text() : part;
  let proofs: unknown;
  try {
    proofs = JSON.parse(text ?? 'null');
  } catch {
    return invalid('proofs');
  }
  if (!Array.isArray(proofs) || proofs.length === 0 || proofs.length > MAX_PROOFS) {
    return invalid('proofs');
  }
  return proofs as ProofEdit[];
}

/** Checks each proof against the files sent: amount above zero, one file per new voucher. */
function checkProofs(proofs: readonly ProofEdit[], files: readonly ProofFileInfo[]): void {
  for (const [index, proof] of proofs.entries()) {
    if (typeof proof.amount !== 'number' || !(proof.amount > 0)) {
      invalid(`proofs[${String(index)}].amount`);
    }
    const needsFile = proof.kind === 'VOUCHER' && proof.id === undefined;
    const pointsAtFile = proof.fileIndex !== undefined && proof.fileIndex < files.length;
    if ((needsFile || proof.fileIndex !== undefined) && !pointsAtFile) {
      invalid(`proofs[${String(index)}].fileIndex`);
    }
  }
}

/**
 * Reads the multipart body of an upload or a correction (GuestPaymentUpload, StayPaymentUpload,
 * DirectPaymentUpload, ProofsCorrection). The files are never read: only their metadata is kept.
 */
export async function readProofsUpload(body: unknown): Promise<ProofsUpload> {
  if (!(body instanceof FormData)) {
    return raise(
      415,
      'UNSUPPORTED_MEDIA_TYPE',
      'No se pudo enviar el formulario. Recarga la página e inténtalo de nuevo.',
    );
  }
  const files = body
    .getAll('files')
    .filter((entry): entry is File => entry instanceof File)
    .map(fileInfo);
  const proofs = await proofsOf(body.get('proofs'));
  checkProofs(proofs, files);
  return {
    proofs,
    files,
    field: (name) => {
      const value = body.get(name);
      return typeof value === 'string' ? value : null;
    },
  };
}
