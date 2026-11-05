import { Injectable, signal } from '@angular/core';

/** One toast (P-17): what happened, its tone and, if any, the action it offers. */
export interface ToastMessage {
  readonly text: string;
  readonly tone: 'success' | null;
  readonly actionLabel: string | null;
  readonly action: (() => void) | null;
}

export interface ToastOptions {
  /** `success` adds the check and the bold text of the canvas («Contraseña cambiada.»). */
  readonly tone?: 'success' | null;
  /** E.g. «Reintentar»; with an action the toast stays until it is used or replaced. */
  readonly actionLabel?: string;
  readonly action?: () => void;
}

/**
 * The toasts of the app (TAR-297): one `app-toast` in the shell shows the last one, so a screen
 * that navigates right after saving (A5.1, A3.5, H3) still has its message read and seen on the
 * screen it lands on. A screen calls `show`; the shell dismisses it.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly message = signal<ToastMessage | null>(null);
  readonly current = this.message.asReadonly();

  show(text: string, options: ToastOptions = {}): void {
    this.message.set({
      text,
      tone: options.tone ?? null,
      actionLabel: options.actionLabel ?? null,
      action: options.action ?? null,
    });
  }

  dismiss(): void {
    this.message.set(null);
  }

  /** The action of the toast shown was used: it runs and the toast goes away. */
  act(): void {
    const action = this.message()?.action ?? null;
    this.dismiss();
    action?.();
  }
}
