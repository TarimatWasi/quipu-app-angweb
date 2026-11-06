import { Routes } from '@angular/router';

/** A7 «Administradores» (RF-22, RF-23); the parent route keeps it for ADMIN. */
export const ADMINISTRATORS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/administrators.component').then((m) => m.AdministratorsComponent),
  },
];
