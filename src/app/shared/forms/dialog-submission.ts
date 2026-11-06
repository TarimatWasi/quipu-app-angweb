import { signal } from '@angular/core';

/** The small part of a dialog reference needed here; no dependency on Material or HTTP. */
interface CloseGuard {
  disableClose: boolean | undefined;
}

/** Serializes a dialog's valid submissions and restores its original close policy in every outcome. */
export class DialogSubmission {
  private readonly active = signal(false);
  readonly pending = this.active.asReadonly();

  constructor(private readonly dialog: CloseGuard) {}

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
