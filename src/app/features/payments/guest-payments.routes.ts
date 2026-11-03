import { Routes } from '@angular/router';
import { GuestHistoryComponent } from './pages/guest-history.component';
import { OwnPaymentComponent } from './pages/own-payment.component';

/** H4 (history) and H3 (send or correct a payment) of the guest with a contract; the parent route keeps them for it. */
export const GUEST_PAYMENTS_ROUTES: Routes = [
  { path: '', component: GuestHistoryComponent },
  { path: 'new', component: OwnPaymentComponent, data: { audience: 'CONTRACT' } },
  { path: ':id', component: OwnPaymentComponent, data: { audience: 'CONTRACT' } },
];

/** T2 (send or correct the payment of the stay) of the temporary guest; the parent route keeps it for it. */
export const TEMPORARY_PAYMENT_ROUTES: Routes = [
  { path: '', component: OwnPaymentComponent, data: { audience: 'TEMPORARY' } },
  { path: ':id', component: OwnPaymentComponent, data: { audience: 'TEMPORARY' } },
];
