import { Routes } from '@angular/router';
import { anonymousGuard } from '@core/guards/anonymous.guard';
import { authGuard } from '@core/guards/auth.guard';
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
    loadChildren: () =>
      import('@features/auth/recovery.routes').then((m) => m.FORGOT_PASSWORD_ROUTES),
  },
  {
    path: 'reset-password',
    loadChildren: () =>
      import('@features/auth/recovery.routes').then((m) => m.RESET_PASSWORD_ROUTES),
  },
  {
    path: 'change-password',
    canActivate: [passwordChangeGuard],
    loadChildren: () =>
      import('@features/auth/change-password.routes').then((m) => m.CHANGE_PASSWORD_ROUTES),
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
        loadChildren: () => import('@features/home/home.routes').then((m) => m.HOME_ROUTES),
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
