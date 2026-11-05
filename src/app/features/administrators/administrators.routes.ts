import { Routes } from '@angular/router';
import { AdministratorsComponent } from './pages/administrators.component';

/** A7 «Administradores» (RF-22, RF-23); the parent route keeps it for ADMIN. */
export const ADMINISTRATORS_ROUTES: Routes = [{ path: '', component: AdministratorsComponent }];
