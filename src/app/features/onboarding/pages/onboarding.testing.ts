import { HttpErrorResponse } from '@angular/common/http';
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Observable, of } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '@core/auth/auth.service';
import { OnboardingService } from '../data/onboarding.service';
import type {
  OnboardingCompleted,
  OnboardingConsentPending,
  OnboardingDocument,
  OnboardingDocumentsPending,
  OnboardingState,
  PersonalDataInput,
} from '../data/onboarding.service';

/** What the three pages of the registration are tested with (O1, O2, O3). */

export const CONSENT = {
  version: '2026-10',
  text: 'Quién trata tus datos. Tarimat Wasi.\n\nQué datos tratamos. Tu nombre.',
};
export const DATA: PersonalDataInput = { name: 'Sonia Ccama Flores', phone: '984 112 730' };

export const toPersonalData: OnboardingState = {
  status: 'ONBOARDING',
  nextStep: 'PERSONAL_DATA',
  personalData: { name: '', phone: '', email: 'sonia@correo.pe' },
  documents: [],
  consent: { ...CONSENT, accepted: false },
};
export const toDocuments: OnboardingDocumentsPending = {
  status: 'ONBOARDING',
  nextStep: 'DOCUMENTS',
  personalData: DATA,
  documents: [],
  consent: { ...CONSENT, accepted: false },
};
export const toConsent: OnboardingConsentPending = {
  ...toDocuments,
  nextStep: 'CONSENT',
};
export const completed: OnboardingCompleted = {
  status: 'ACTIVE',
  personalData: DATA,
  documents: [],
  consent: { ...CONSENT, accepted: true },
};

export const document = (id: string, originalName = 'dni.jpg'): OnboardingDocument => ({
  id,
  originalName,
  contentType: 'image/jpeg',
  sizeBytes: 1_258_291,
  uploadedAt: '2026-03-02T15:00:00Z',
});

export const httpError = (status: number, body: object | null = null) =>
  new HttpErrorResponse({ status, error: body, statusText: 'Error' });

export interface Api {
  state: ReturnType<typeof vi.fn<() => Observable<OnboardingState>>>;
  savePersonalData: ReturnType<
    typeof vi.fn<(data: PersonalDataInput) => Observable<OnboardingDocumentsPending>>
  >;
  uploadDocument: ReturnType<typeof vi.fn<(file: File) => Observable<OnboardingDocument>>>;
  finishDocuments: ReturnType<typeof vi.fn<() => Observable<OnboardingConsentPending>>>;
  acceptConsent: ReturnType<typeof vi.fn<(version: string) => Observable<OnboardingCompleted>>>;
  emailVerification: {
    request: ReturnType<typeof vi.fn<(email: string) => Observable<unknown>>>;
    confirm: ReturnType<typeof vi.fn<(code: string) => Observable<unknown>>>;
  };
}

/** The service as the page sees it: every call answers well unless the test says otherwise. */
export function fakeApi(state: OnboardingState): Api {
  return {
    state: vi.fn(() => of(state)),
    savePersonalData: vi.fn(() => of(toDocuments)),
    uploadDocument: vi.fn(() => of(document('d1'))),
    finishDocuments: vi.fn(() => of(toConsent)),
    acceptConsent: vi.fn(() => of(completed)),
    emailVerification: { request: vi.fn(() => of(null)), confirm: vi.fn(() => of(null)) },
  };
}

/** Opens a step of the registration with the service faked and the other steps as empty routes. */
export async function openStep(
  component: Type<unknown>,
  step: 'personal-data' | 'documents' | 'consent',
  api: Api,
  guestType: 'CONTRACT' | 'TEMPORARY' = 'CONTRACT',
) {
  const steps = ['personal-data', 'documents', 'consent'] as const;
  const auth = { session: () => ({ guestType }), onboardingAdvanced: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        ...steps.map((path) =>
          path === step
            ? { path: `onboarding/${path}`, component }
            : { path: `onboarding/${path}`, children: [] },
        ),
        { path: 'home', children: [] },
      ]),
      { provide: OnboardingService, useValue: api },
      { provide: AuthService, useValue: auth },
    ],
  });
  const harness = await RouterTestingHarness.create();
  await TestBed.inject(Router).navigateByUrl(`/onboarding/${step}`);
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    // A resource keeps the app unstable while it reads: tick instead of waiting for it.
    TestBed.tick();
    harness.detectChanges();
  };
  await settle();
  const router = TestBed.inject(Router);
  return { harness, settle, router, auth };
}
