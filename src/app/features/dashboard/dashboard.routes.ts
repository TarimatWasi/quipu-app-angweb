import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home.component';

/**
 * The home of every role (`/home`). `panels` are the child routes shown in its outlet for a guest:
 * they belong to my-account, and src/app/home.routes.ts passes them in, because a feature never
 * imports another (QP-ANGWEB-ORG-01).
 */
export const dashboardRoutes = (panels: Routes): Routes => [
  { path: '', component: HomeComponent, children: panels },
];
