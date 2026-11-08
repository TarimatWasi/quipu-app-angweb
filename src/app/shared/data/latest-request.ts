import { DestroyRef, inject } from '@angular/core';

/**
 * Which answer of a kind of request still counts (TAR-325): only the last one started, and none
 * once the page is gone. A page that reads the same thing twice (a retry, a new filter, a new
 * identity) asks begin() for its number and, when the answer arrives, isCurrent(number) says
 * whether it is still the one that matters. It was a counter and a «destroyed» flag in 11 pages,
 * each with its own spelling. Create it where the page is built: it reads the page's DestroyRef.
 */
export class LatestRequest {
  private latest = 0;

  constructor(private readonly destroyRef: DestroyRef = inject(DestroyRef)) {}

  /** A new request: the answers of the previous ones stop counting. */
  begin(): number {
    return ++this.latest;
  }

  /** Whether `request` is the last one started and the page is still on screen. */
  isCurrent(request: number): boolean {
    return !this.destroyRef.destroyed && request === this.latest;
  }

  /** The answers in flight stop counting, as if a new request had started (a change of identity). */
  cancel(): void {
    this.latest++;
  }
}
