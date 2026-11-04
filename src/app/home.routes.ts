import { Routes } from '@angular/router';
import { dashboardRoutes } from '@features/dashboard/dashboard.routes';
import { HOME_PANEL_ROUTES } from '@features/my-account/my-account.routes';

/**
 * `/home`: the home of dashboard with the guest's panels of my-account inside it. A feature never
 * imports another (QP-ANGWEB-ORG-01), so they meet here, next to app.routes, which loads this file
 * on demand: the home and the panels share one chunk, as before the split into features.
 */
export const HOME_ROUTES: Routes = dashboardRoutes(HOME_PANEL_ROUTES);
