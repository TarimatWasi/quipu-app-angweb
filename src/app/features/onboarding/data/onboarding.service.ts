import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { components } from '@core/api/bff.generated';
import { BFF_BASE_URL } from '@core/config/bff-base-url';
import { CsrfBootstrapService } from '@core/http/csrf-bootstrap.service';
import type { EmailVerificationClient } from '@shared/forms/email-verification';

// Every type comes from the contract (TAR-23).
export type OnboardingState = components['schemas']['OnboardingState'];
export type OnboardingInProgress = components['schemas']['OnboardingInProgress'];
export type OnboardingDocumentsPending = components['schemas']['OnboardingDocumentsPending'];
export type OnboardingConsentPending = components['schemas']['OnboardingConsentPending'];
export type OnboardingCompleted = components['schemas']['OnboardingCompleted'];
export type PersonalDataInput = components['schemas']['PersonalDataInput'];
export type OnboardingDocument = components['schemas']['GuestDocumentRef'];

/**
 * O1 to O3 (CU-25, CU-26, RN-33): the onboarding of the guest of the session. The guest is always the
 * one of the session, so no guest id ever travels (RN-09). It is the same for both kinds of guest.
 */
@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly http = inject(HttpClient);
  private readonly csrf = inject(CsrfBootstrapService);
  private readonly base = `${inject(BFF_BASE_URL)}/bff/guest/onboarding`;

  /** The step to go to, what is saved and the consent text in force (never cacheable). */
  state(): Observable<OnboardingState> {
    return this.http.get<OnboardingState>(this.base);
  }

  /** O1: name and phone are required; the emergency contact is not. The email is not sent here. */
  savePersonalData(data: PersonalDataInput): Observable<OnboardingDocumentsPending> {
    return this.csrf.protect(() =>
      this.http.put<OnboardingDocumentsPending>(`${this.base}/personal-data`, data),
    );
  }

  /** O1 «Cambiar correo» (TAR-349): the path of the onboarding, for both kinds of guest. */
  readonly emailVerification: EmailVerificationClient = {
    request: (email) =>
      this.csrf.protect(() => this.http.post<null>(`${this.base}/email-verification`, { email })),
    confirm: (code) =>
      this.csrf.protect(() =>
        this.http.post<null>(`${this.base}/email-verification/confirm`, { code }),
      ),
  };

  /** O2: one file per call (multipart); the guest cannot delete or replace it later (RN-37). */
  uploadDocument(file: File): Observable<OnboardingDocument> {
    const body = new FormData();
    body.append('file', file, file.name);
    return this.csrf.protect(() =>
      this.http.post<OnboardingDocument>(`${this.base}/documents`, body),
    );
  }

  /** O2: the step is finished, with files or skipped. */
  finishDocuments(): Observable<OnboardingConsentPending> {
    return this.csrf.protect(() =>
      this.http.post<OnboardingConsentPending>(`${this.base}/documents/done`, null),
    );
  }

  /** O3: accepting the text in force closes the onboarding and the guest becomes Active (RN-36). */
  acceptConsent(consentVersion: string): Observable<OnboardingCompleted> {
    return this.csrf.protect(() =>
      this.http.post<OnboardingCompleted>(`${this.base}/consent`, {
        accepted: true,
        consentVersion,
      }),
    );
  }
}
