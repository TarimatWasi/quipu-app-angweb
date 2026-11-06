import { Routes } from '@angular/router';
import { dashboardRoutes } from '@features/dashboard/dashboard.routes';
import { HOME_PANEL_ROUTES } from '@features/my-account/my-account.routes';

/**
 * `/home`: the home of dashboard with the guest's panels of my-account inside it. A feature never
 * imports another (QP-ANGWEB-ORG-01), so they meet here, next to app.routes, which loads this file
 * on demand. The account panels load separately, only when the home activates their route.
 */
export const HOME_ROUTES: Routes = dashboardRoutes(HOME_PANEL_ROUTES);
