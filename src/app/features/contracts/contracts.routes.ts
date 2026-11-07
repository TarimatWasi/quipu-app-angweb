import { Routes } from '@angular/router';

/** A4 (list), A4.1 (load) and A4.2 (detail, with A4.3 «Finalizar») of the administrator. */
export const CONTRACTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/contracts-list.component').then((m) => m.ContractsListComponent),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./pages/contract-form.component').then((m) => m.ContractFormComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/contract-detail.component').then((m) => m.ContractDetailComponent),
  },
];
