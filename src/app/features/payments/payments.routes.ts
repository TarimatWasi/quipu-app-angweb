import { Routes } from '@angular/router';
import { DirectPaymentComponent } from './pages/direct-payment.component';
import { PaymentQueueComponent } from './pages/payment-queue.component';
import { PaymentReviewComponent } from './pages/payment-review.component';

/** A5 (queue), A5.1 (direct payment) and A5.2 (review) of the administrator; the parent route keeps them for ADMIN. */
export const PAYMENTS_ROUTES: Routes = [
  { path: '', component: PaymentQueueComponent },
  { path: 'new', component: DirectPaymentComponent },
  { path: ':id', component: PaymentReviewComponent },
];
