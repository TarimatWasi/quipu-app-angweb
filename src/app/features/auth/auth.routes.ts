import { Routes } from '@angular/router';

// One routes file per feature (QP-ANGWEB-ORG-02); app.routes mounts each set at its own path. The
// pages all load on demand, so recovery and activation do not download the login's code.
export const AUTH_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/login.component').then((m) => m.LoginComponent),
  },
];

export const FORGOT_PASSWORD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/forgot-password.component').then((m) => m.ForgotPasswordComponent),
  },
];

export const RESET_PASSWORD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/reset-password.component').then((m) => m.ResetPasswordComponent),
  },
];

/** A0.4: the link the administrator hands a guest to choose a password (CU-24, RN-32). */
export const ACTIVATE_ACCOUNT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/activate-account.component').then((m) => m.ActivateAccountComponent),
  },
];

/** A0.5: the link of the email that gives an administrator access (RF-22). */
export const ACTIVATE_ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/activate-admin.component').then((m) => m.ActivateAdminComponent),
  },
];

export const CHANGE_PASSWORD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/change-password.component').then((m) => m.ChangePasswordComponent),
  },
];

/** A0.7 «Página no encontrada»: any address that matches no page, with or without a session. */
export const NOT_FOUND_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/not-found.component').then((m) => m.NotFoundComponent),
  },
];

/** A0.7 «Sin acceso»: where a role guard sends a session, under the address it asked for. */
export const NO_ACCESS_ROUTES: Routes = [
  {
    path: '',
    data: { reason: 'no-access' },
    loadComponent: () => import('./pages/not-found.component').then((m) => m.NotFoundComponent),
  },
];
