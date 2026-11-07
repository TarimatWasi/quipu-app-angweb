import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EMPTY, expand, Observable, reduce } from 'rxjs';
import type { components } from '@core/api/bff.generated';
import { BFF_BASE_URL } from '@core/config/bff-base-url';
import { CsrfBootstrapService } from '@core/http/csrf-bootstrap.service';

// Every type comes from the contract (TAR-23).
export type GuestDocument = components['schemas']['GuestDocument'];
export type GuestDocumentAction = components['schemas']['GuestDocumentAction'];
export type DocumentActionPage = components['schemas']['PagedGuestDocumentActions'];
export type DocumentActionRequest = components['schemas']['DocumentActionRequest'];
export type DocumentActionReason = components['schemas']['DocumentActionReason'];
export type DocumentRequestChannel = components['schemas']['DocumentRequestChannel'];

/** The most the contract allows per page; the evidence of a guest is read whole. */
const ACTIONS_PAGE_SIZE = 100;

/**
 * The documents a guest uploaded, seen by the administrator (A3.8, CU-27, CU-29, RN-37): the list
 * with signed links that last 15 minutes, and the two ways to change one, always with evidence:
 * delete it or replace it on an ARCO request of the holder or an upload error. Ids and cursors are
 * opaque: they are passed back exactly as the BFF gave them, only escaped for the URL.
 */
@Injectable({ providedIn: 'root' })
export class AdminGuestDocumentsService {
  private readonly http = inject(HttpClient);
  private readonly csrf = inject(CsrfBootstrapService);
  private readonly base = `${inject(BFF_BASE_URL)}/bff/admin/guests`;

  /** The documents of the guest, each with a link that expires 15 minutes after this answer. */
  list(guestId: string): Observable<GuestDocument[]> {
    return this.http.get<GuestDocument[]>(this.documentsUrl(guestId));
  }

  /** One page of the evidence of deletions and replacements, newest first. */
  actions(guestId: string, after?: string): Observable<DocumentActionPage> {
    let params = new HttpParams().set('limit', ACTIONS_PAGE_SIZE);
    if (after !== undefined) {
      params = params.set('after', after);
    }
    return this.http.get<DocumentActionPage>(`${this.guestUrl(guestId)}/document-actions`, {
      params,
    });
  }

  /** Every entry of the evidence, newest first, walking the pages. */
  allActions(guestId: string): Observable<GuestDocumentAction[]> {
    return this.actions(guestId).pipe(
      expand((page) => (page.nextCursor === null ? EMPTY : this.actions(guestId, page.nextCursor))),
      reduce<DocumentActionPage, GuestDocumentAction[]>(
        (all, page) => all.concat(page.content),
        [],
      ),
    );
  }

  /** Deletes a document for good and leaves the evidence (204); the body is JSON, not a DELETE. */
  delete(guestId: string, documentId: string, request: DocumentActionRequest): Observable<null> {
    return this.csrf.protect(() =>
      this.http.post<null>(`${this.documentUrl(guestId, documentId)}/deletion`, request),
    );
  }

  /** Replaces a document with a new file (multipart); the answer is the new one, with a new id. */
  replace(
    guestId: string,
    documentId: string,
    file: File,
    request: DocumentActionRequest,
  ): Observable<GuestDocument> {
    return this.csrf.protect(() =>
      this.http.put<GuestDocument>(
        this.documentUrl(guestId, documentId),
        replaceBody(file, request),
      ),
    );
  }

  private guestUrl(guestId: string): string {
    return `${this.base}/${encodeURIComponent(guestId)}`;
  }

  private documentsUrl(guestId: string): string {
    return `${this.guestUrl(guestId)}/documents`;
  }

  private documentUrl(guestId: string, documentId: string): string {
    return `${this.documentsUrl(guestId)}/${encodeURIComponent(documentId)}`;
  }
}

/** The multipart form of a replacement: the file and the fields that apply to the reason. */
function replaceBody(file: File, request: DocumentActionRequest): FormData {
  const body = new FormData();
  body.append('file', file, file.name);
  body.append('reason', request.reason);
  if (request.requestedAt !== undefined) body.append('requestedAt', request.requestedAt);
  if (request.requestChannel !== undefined) body.append('requestChannel', request.requestChannel);
  if (request.note !== undefined) body.append('note', request.note);
  return body;
}
