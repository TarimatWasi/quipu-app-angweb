import { Routes } from '@angular/router';
import { DocumentFormComponent } from './pages/document-form.component';
import { GuestDetailComponent } from './pages/guest-detail.component';
import { GuestsListComponent } from './pages/guests-list.component';
import { StayFormComponent } from './pages/stay-form.component';

/** A3, A3.2 (minimal) and A3.5 of the administrator; the parent route keeps them for ADMIN. */
export const GUESTS_ROUTES: Routes = [
  { path: '', component: GuestsListComponent },
  { path: ':id', component: GuestDetailComponent },
  { path: ':id/document', component: DocumentFormComponent },
  { path: ':id/stays/new', component: StayFormComponent },
  { path: ':id/stays/:stayId', component: StayFormComponent },
];
