import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ChangeResourcesService } from './change-resources.service';

describe('mounted change resources (QP-ANGWEB-SSE-02)', () => {
  it('deduplicates bursts and retains an invalidation received during a GET', () => {
    const service = TestBed.inject(ChangeResourcesService);
    const busy = signal(true);
    const reload = vi.fn(() => {
      busy.set(true);
    });
    const release = service.register({ keys: ['guest.home'], busy, reload });
    service.ready();
    service.changed(['guest.home']);
    TestBed.tick();
    expect(reload).not.toHaveBeenCalled();
    busy.set(false);
    TestBed.tick();
    expect(reload).toHaveBeenCalledTimes(1);
    service.changed(['guest.home']);
    service.changed(['guest.home']);
    TestBed.tick();
    expect(reload).toHaveBeenCalledTimes(1);
    busy.set(false);
    TestBed.tick();
    expect(reload).toHaveBeenCalledTimes(2);
    release();
    busy.set(false);
    service.ready();
    TestBed.tick();
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('matches current identities and refreshes only mounted resources on ALL', () => {
    const service = TestBed.inject(ChangeResourcesService);
    const id = signal('one');
    const reload = vi.fn();
    const release = service.register({ keys: () => [`admin.guest:${id()}`], reload });
    service.changed(['admin.guest:other']);
    TestBed.tick();
    expect(reload).not.toHaveBeenCalled();
    id.set('other');
    service.changed(['admin.guest:other']);
    TestBed.tick();
    expect(reload).toHaveBeenCalledTimes(1);
    service.changed('ALL');
    TestBed.tick();
    expect(reload).toHaveBeenCalledTimes(2);
    release();
  });

  it('defers a dirty resource until an explicit reload decision', () => {
    const service = TestBed.inject(ChangeResourcesService);
    const dirty = signal(true);
    const reload = vi.fn();
    const stale = vi.fn();
    const release = service.register({ keys: ['guest.home'], defer: dirty, stale, reload });
    service.ready();
    service.changed(['guest.home']);
    TestBed.tick();
    expect(stale).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
    dirty.set(false);
    TestBed.tick();
    expect(reload).not.toHaveBeenCalled();
    service.changed(['guest.home']);
    TestBed.tick();
    expect(reload).toHaveBeenCalledOnce();
    release();
  });
  it('does not invalidate an unmounted read whose keys are empty', () => {
    const service = TestBed.inject(ChangeResourcesService);
    const reload = vi.fn();
    const release = service.register({ keys: [], reload });
    service.ready();
    service.changed('ALL');
    TestBed.tick();
    expect(reload).not.toHaveBeenCalled();
    release();
  });
});
