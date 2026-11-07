import { Routes } from '@angular/router';

/** A6 «Finanzas» of the administrator; A6.1 to A6.5 are dialogs of this page. */
export const FINANCE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/finance.component').then((m) => m.FinanceComponent),
  },
];
