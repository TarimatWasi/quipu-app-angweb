import { Routes } from '@angular/router';

/** H1 and T1: the guest's panels inside the home; src/app/home.routes.ts nests them there. */
export const HOME_PANEL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/account-home.component').then((m) => m.AccountHomeComponent),
  },
];

// H3, H4 and T2 load on demand: the home reaches this file for every role, and the guest's
// payment pages must not travel with it.

const loadHistory = () =>
  import('./pages/guest-history.component').then((m) => m.GuestHistoryComponent);
const loadOwnPayment = () =>
  import('./pages/own-payment.component').then((m) => m.OwnPaymentComponent);

/** H4 (history) and H3 (send or correct a payment) of the guest with a contract; the parent route keeps them for it. */
export const GUEST_PAYMENTS_ROUTES: Routes = [
  { path: '', loadComponent: loadHistory },
  { path: 'new', loadComponent: loadOwnPayment, data: { audience: 'CONTRACT' } },
  { path: ':id', loadComponent: loadOwnPayment, data: { audience: 'CONTRACT' } },
];

/** T2 (send or correct the payment of the stay) of the temporary guest; the parent route keeps it for it. */
export const TEMPORARY_PAYMENT_ROUTES: Routes = [
  { path: '', loadComponent: loadOwnPayment, data: { audience: 'TEMPORARY' } },
  { path: ':id', loadComponent: loadOwnPayment, data: { audience: 'TEMPORARY' } },
];
