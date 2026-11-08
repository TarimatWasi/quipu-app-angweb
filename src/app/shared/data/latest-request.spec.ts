import { DestroyRef } from '@angular/core';
import { LatestRequest } from './latest-request';

function life() {
  const destroyRef = { destroyed: false } as DestroyRef;
  return { destroyRef, destroy: () => ((destroyRef as { destroyed: boolean }).destroyed = true) };
}

describe('LatestRequest (TAR-325)', () => {
  it('only the last request started counts', () => {
    const { destroyRef } = life();
    const latest = new LatestRequest(destroyRef);
    const first = latest.begin();
    const second = latest.begin();

    expect(latest.isCurrent(first)).toBe(false);
    expect(latest.isCurrent(second)).toBe(true);
  });

  it('nothing counts once the page is gone', () => {
    const { destroyRef, destroy } = life();
    const latest = new LatestRequest(destroyRef);
    const request = latest.begin();
    destroy();

    expect(latest.isCurrent(request)).toBe(false);
  });

  it('cancel drops the answers in flight without starting another request', () => {
    const { destroyRef } = life();
    const latest = new LatestRequest(destroyRef);
    const request = latest.begin();
    latest.cancel();

    expect(latest.isCurrent(request)).toBe(false);
    expect(latest.isCurrent(latest.begin())).toBe(true);
  });
});
