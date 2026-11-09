import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { components } from '@core/api/bff.generated';
import { CsrfBootstrapService } from '@core/http/csrf-bootstrap.service';
import type { EmailVerificationClient } from '@shared/forms/email-verification';

// Every type comes from the contract (TAR-23).
export type OwnProfile = components['schemas']['OwnProfile'];
export type ProfileUpdate = components['schemas']['ProfileUpdateInput'];
export type OwnDocumentRef = components['schemas']['GuestDocumentRef'];
export type OwnDocument = components['schemas']['GuestDocument'];
export type OwnSummary = components['schemas']['GuestSummary'];

/**
 * What H5 (guest with a contract) and T3 (temporary guest) share: the own data, its edition and
 * the own documents. The guest is always the one of the session; no guest id ever travels
 * (RN-09). The two services only say under which path of the BFF they work.
 */
export abstract class OwnProfileClient {
  private readonly http = inject(HttpClient);
  private readonly csrf = inject(CsrfBootstrapService);
  /** `…/bff/guest` or `…/bff/temporary-guest`. */
  protected abstract readonly base: string;

  /** The data, the email (and the one waiting for its code) and the documents without links. */
  profile(): Observable<OwnProfile> {
    return this.http.get<OwnProfile>(`${this.base}/profile`);
  }

  /** Changes only what is sent; an absent field keeps its value (RN-17). */
  update(changes: ProfileUpdate): Observable<OwnSummary> {
    return this.csrf.protect(() => this.http.patch<OwnSummary>(`${this.base}/profile`, changes));
  }

  /** «Cambiar correo» (TAR-349): a code to the new address, then the code changes the email. */
  readonly emailVerification: EmailVerificationClient = {
    request: (email) =>
      this.csrf.protect(() => this.http.post<null>(`${this.base}/email-verification`, { email })),
    confirm: (code) =>
      this.csrf.protect(() =>
        this.http.post<null>(`${this.base}/email-verification/confirm`, { code }),
      ),
  };

  /** Uploads one document (multipart); it cannot be deleted or replaced by the guest (RN-37). */
  upload(file: File): Observable<OwnDocumentRef> {
    const body = new FormData();
    body.append('file', file, file.name);
    return this.csrf.protect(() => this.http.post<OwnDocumentRef>(`${this.base}/documents`, body));
  }

  /** One own document with a signed link of 15 minutes. Ids are opaque, only escaped for the URL. */
  document(id: string): Observable<OwnDocument> {
    return this.http.get<OwnDocument>(`${this.base}/documents/${encodeURIComponent(id)}`);
  }
}
