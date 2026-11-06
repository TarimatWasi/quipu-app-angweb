import { Routes } from '@angular/router';

const loadStayForm = () => import('./pages/stay-form.component').then((m) => m.StayFormComponent);

/**
 * A3, A3.1, A3.2 (minimal), A3.5 and A3.7 of the administrator; the parent route keeps them for
 * ADMIN. `new` goes before `:id`, which would take it for an id.
 */
export const GUESTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/guests-list.component').then((m) => m.GuestsListComponent),
  },
  {
    path: 'new',
    loadComponent: () => import('./pages/new-guest.component').then((m) => m.NewGuestComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/guest-detail.component').then((m) => m.GuestDetailComponent),
  },
  {
    path: ':id/access',
    loadComponent: () => import('./pages/access.component').then((m) => m.AccessComponent),
  },
  {
    path: ':id/document',
    loadComponent: () =>
      import('./pages/document-form.component').then((m) => m.DocumentFormComponent),
  },
  { path: ':id/stays/new', loadComponent: loadStayForm },
  { path: ':id/stays/:stayId', loadComponent: loadStayForm },
];
