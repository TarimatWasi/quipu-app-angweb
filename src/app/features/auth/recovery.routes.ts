import { Routes } from '@angular/router';
import { ForgotPasswordComponent } from './pages/forgot-password.component';
import { ResetPasswordComponent } from './pages/reset-password.component';

export const FORGOT_PASSWORD_ROUTES: Routes = [{ path: '', component: ForgotPasswordComponent }];

export const RESET_PASSWORD_ROUTES: Routes = [{ path: '', component: ResetPasswordComponent }];
