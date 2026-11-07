// Seeded documents of the guests (A3.8): as many per guest as its `documentCount`, with made-up
// names, relative to today so the demo always looks current. Nothing here is a real file.
import { ADMIN_REVIEWER, GUEST_IDS } from './demo-users';
import { addDays, instantOn, today } from './mock-dates';
import { ID_KIND, mockId } from './mock-db';
import type {
  DocumentActionRecord,
  DocumentContentType,
  DocumentRecord,
  GuestRecord,
} from './mock-db';

interface DocumentKind {
  readonly name: string;
  readonly contentType: DocumentContentType;
  readonly sizeBytes: number;
}

/** What a guest usually uploads in its onboarding, in this order (RN-37, at most five). */
const KINDS: readonly DocumentKind[] = [
  { name: 'documento-de-identidad.jpg', contentType: 'image/jpeg', sizeBytes: 1_258_291 },
  { name: 'recibo-de-luz.pdf', contentType: 'application/pdf', sizeBytes: 317_440 },
  { name: 'foto-del-contrato.png', contentType: 'image/png', sizeBytes: 2_411_724 },
  { name: 'constancia-de-estudios.pdf', contentType: 'application/pdf', sizeBytes: 884_736 },
  { name: 'carta-de-referencia.pdf', contentType: 'application/pdf', sizeBytes: 152_576 },
];

/** The documents each guest says it has (`documentCount`), uploaded some weeks ago. */
export function seedDocuments(guests: readonly GuestRecord[]): DocumentRecord[] {
  const uploadedAt = instantOn(addDays(today(), -45));
  let n = 0;
  return guests.flatMap((guest) =>
    KINDS.slice(0, guest.documentCount).map((kind) => {
      n += 1;
      return {
        id: mockId(ID_KIND.document, n),
        guestId: guest.id,
        originalName: kind.name,
        contentType: kind.contentType,
        sizeBytes: kind.sizeBytes,
        uploadedAt,
      };
    }),
  );
}

/**
 * One past replacement for Luis, who has two documents, so the history of A3.8 is not empty in
 * the demo. The evidence carries the type and size of what was replaced, never its name (RN-37).
 */
export function seedDocumentActions(documents: readonly DocumentRecord[]): DocumentActionRecord[] {
  const first = documents.find((document) => document.guestId === GUEST_IDS.luis);
  if (first === undefined) return [];
  return [
    {
      id: mockId(ID_KIND.documentAction, 1),
      guestId: first.guestId,
      action: 'REPLACE',
      documentId: mockId(ID_KIND.document, 900),
      replacementDocumentId: first.id,
      reason: 'UPLOAD_ERROR',
      requestedAt: null,
      requestChannel: null,
      note: null,
      contentType: 'image/jpeg',
      sizeBytes: 4_718_592,
      actorId: ADMIN_REVIEWER.id,
      actorName: ADMIN_REVIEWER.name,
      performedAt: instantOn(addDays(today(), -44)),
    },
  ];
}
