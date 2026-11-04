import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login.component';

// One routes file per feature (QP-ANGWEB-ORG-02); app.routes mounts each set at its own path. The
// login comes with this file; the other pages load on demand, so a path downloads only its page.
export const AUTH_ROUTES: Routes = [{ path: '', component: LoginComponent }];

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

export const CHANGE_PASSWORD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/change-password.component').then((m) => m.ChangePasswordComponent),
  },
];
