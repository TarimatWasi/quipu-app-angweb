import { Routes } from '@angular/router';
import { AccessComponent } from './pages/access.component';
import { DocumentFormComponent } from './pages/document-form.component';
import { GuestDetailComponent } from './pages/guest-detail.component';
import { GuestsListComponent } from './pages/guests-list.component';
import { NewGuestComponent } from './pages/new-guest.component';
import { StayFormComponent } from './pages/stay-form.component';

/**
 * A3, A3.1, A3.2 (minimal), A3.5 and A3.7 of the administrator; the parent route keeps them for
 * ADMIN. `new` goes before `:id`, which would take it for an id.
 */
export const GUESTS_ROUTES: Routes = [
  { path: '', component: GuestsListComponent },
  { path: 'new', component: NewGuestComponent },
  { path: ':id', component: GuestDetailComponent },
  { path: ':id/access', component: AccessComponent },
  { path: ':id/document', component: DocumentFormComponent },
  { path: ':id/stays/new', component: StayFormComponent },
  { path: ':id/stays/:stayId', component: StayFormComponent },
];
