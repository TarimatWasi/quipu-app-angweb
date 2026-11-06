import { Routes } from '@angular/router';

/**
 * The home of every role (`/home`). `panels` are the child routes shown in its outlet for a guest:
 * they belong to my-account, and src/app/home.routes.ts passes them in, because a feature never
 * imports another (QP-ANGWEB-ORG-01).
 */
export const dashboardRoutes = (panels: Routes): Routes => [
  {
    path: '',
    loadComponent: () => import('./pages/home.component').then((m) => m.HomeComponent),
    children: panels,
  },
];
