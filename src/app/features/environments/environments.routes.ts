import { Routes } from '@angular/router';

/** A2 (list), A2.1 (new) and A2.4 (edit) of the administrator; the parent route keeps them for ADMIN. */
export const ENVIRONMENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/environments-list.component').then((m) => m.EnvironmentsListComponent),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./pages/environment-form.component').then((m) => m.EnvironmentFormComponent),
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./pages/environment-form.component').then((m) => m.EnvironmentFormComponent),
  },
];
