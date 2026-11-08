import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';

/** The small part of a dialog reference needed here; no dependency on Material or HTTP. */
interface CloseGuard {
  disableClose: boolean | undefined;
  close(): void;
}

/** Serializes a dialog's valid submissions and restores its original close policy in every outcome. */
export class DialogSubmission {
  private readonly active = signal(false);
  readonly pending = this.active.asReadonly();

  constructor(private readonly dialog: CloseGuard) {}

  /**
   * A 401 is the session interceptor's: it already forgot the session and goes to the login, so the
   * dialog only goes away (TAR-323). Gives true when it was a 401 and the dialog closed.
   */
  sessionEnded(error: unknown): boolean {
    if (!(error instanceof HttpErrorResponse) || error.status !== 401) return false;
    this.dialog.close();
    return true;
  }

  async run<T>(action: () => Promise<T>): Promise<T | undefined> {
    if (this.active()) return undefined;
    const previous = this.dialog.disableClose;
    this.active.set(true);
    this.dialog.disableClose = true;
    try {
      return await action();
    } finally {
      this.dialog.disableClose = previous;
      this.active.set(false);
    }
  }
}
