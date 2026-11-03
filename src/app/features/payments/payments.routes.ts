import { Routes } from '@angular/router';
import { PaymentQueueComponent } from './pages/payment-queue.component';
import { PaymentReviewComponent } from './pages/payment-review.component';

/** A5 (queue) and A5.2 (review) of the administrator; the parent route keeps them for ADMIN. */
export const PAYMENTS_ROUTES: Routes = [
  { path: '', component: PaymentQueueComponent },
  { path: ':id', component: PaymentReviewComponent },
];
