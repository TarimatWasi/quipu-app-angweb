import { Routes } from '@angular/router';

const loadStayForm = () => import('./pages/stay-form.component').then((m) => m.StayFormComponent);

/**
 * A3, A3.1, A3.2, A3.5, A3.7 and A3.8 of the administrator; the parent route keeps them for
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
    path: ':id/documents',
    loadComponent: () =>
      import('./pages/guest-documents.component').then((m) => m.GuestDocumentsComponent),
  },
  {
    path: ':id/document',
    loadComponent: () =>
      import('./pages/document-form.component').then((m) => m.DocumentFormComponent),
  },
  { path: ':id/stays/new', loadComponent: loadStayForm },
  { path: ':id/stays/:stayId', loadComponent: loadStayForm },
];
