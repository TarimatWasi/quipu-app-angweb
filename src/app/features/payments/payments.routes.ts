import { Routes } from '@angular/router';

/** A5 (queue), A5.1 (direct payment) and A5.2 (review) of the administrator; the parent route keeps them for ADMIN. */
export const PAYMENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/payment-queue.component').then((m) => m.PaymentQueueComponent),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./pages/direct-payment.component').then((m) => m.DirectPaymentComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/payment-review.component').then((m) => m.PaymentReviewComponent),
  },
];
