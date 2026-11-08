import { Routes } from '@angular/router';

/**
 * O1, O2 and O3 «Tu registro» (CU-25, CU-26): the three steps of a guest in onboarding. Each page
 * asks the BFF which step comes next and goes there if it is not its own (RN-33).
 */
export const ONBOARDING_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'personal-data' },
  {
    path: 'personal-data',
    loadComponent: () =>
      import('./pages/personal-data.component').then((m) => m.OnboardingPersonalDataComponent),
  },
  {
    path: 'documents',
    loadComponent: () =>
      import('./pages/documents.component').then((m) => m.OnboardingDocumentsComponent),
  },
  {
    path: 'consent',
    loadComponent: () =>
      import('./pages/consent.component').then((m) => m.OnboardingConsentComponent),
  },
];
