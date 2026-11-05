import { Routes } from '@angular/router';
import { adminGuard } from '@core/guards/admin.guard';
import { anonymousGuard } from '@core/guards/anonymous.guard';
import { authGuard } from '@core/guards/auth.guard';
import { contractGuestGuard, temporaryGuestGuard } from '@core/guards/guest.guard';
import { passwordChangeGuard } from '@core/guards/password-change.guard';
import { AppShellComponent } from '@layout/app-shell/app-shell.component';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [anonymousGuard],
    loadChildren: () => import('@features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'forgot-password',
    canActivate: [anonymousGuard],
    loadChildren: () => import('@features/auth/auth.routes').then((m) => m.FORGOT_PASSWORD_ROUTES),
  },
  {
    path: 'reset-password',
    loadChildren: () => import('@features/auth/auth.routes').then((m) => m.RESET_PASSWORD_ROUTES),
  },
  {
    path: 'activate',
    loadChildren: () => import('@features/auth/auth.routes').then((m) => m.ACTIVATE_ACCOUNT_ROUTES),
  },
  {
    path: 'activate-admin',
    loadChildren: () => import('@features/auth/auth.routes').then((m) => m.ACTIVATE_ADMIN_ROUTES),
  },
  {
    path: 'change-password',
    canActivate: [passwordChangeGuard],
    loadChildren: () => import('@features/auth/auth.routes').then((m) => m.CHANGE_PASSWORD_ROUTES),
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  // Pages behind the login share the app bar (layout/), which is their parent route.
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'home',
        loadChildren: () => import('./home.routes').then((m) => m.HOME_ROUTES),
      },
      {
        path: 'admin/payments',
        canActivate: [adminGuard],
        loadChildren: () =>
          import('@features/payments/payments.routes').then((m) => m.PAYMENTS_ROUTES),
      },
      {
        path: 'admin/guests',
        canActivate: [adminGuard],
        loadChildren: () => import('@features/guests/guests.routes').then((m) => m.GUESTS_ROUTES),
      },
      {
        path: 'guest/payments',
        canActivate: [contractGuestGuard],
        loadChildren: () =>
          import('@features/my-account/my-account.routes').then((m) => m.GUEST_PAYMENTS_ROUTES),
      },
      {
        path: 'temporary-guest/payment',
        canActivate: [temporaryGuestGuard],
        loadChildren: () =>
          import('@features/my-account/my-account.routes').then((m) => m.TEMPORARY_PAYMENT_ROUTES),
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
