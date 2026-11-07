import { InjectionToken } from '@angular/core';

/**
 * Opens A0.6 «Cambiar contraseña» over the current page; `restoreFocus` is where the focus goes back
 * to once it closes. The dialog lives in layout/, which no feature may import: the app shell
 * provides this action to the pages it holds (H5, T3 link to it) and tells a changed password.
 */
export type ChangePasswordAction = (restoreFocus?: HTMLElement) => Promise<void>;

export const CHANGE_PASSWORD_ACTION = new InjectionToken<ChangePasswordAction>(
  'CHANGE_PASSWORD_ACTION',
);
