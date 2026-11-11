import { DestroyRef, effect, inject, Injectable, Injector, signal, untracked } from '@angular/core';
import type { EffectRef } from '@angular/core';
import type { ChangeKey } from './change-events';

export interface MountedChangeResource {
  readonly keys: readonly ChangeKey[] | (() => readonly ChangeKey[]);
  readonly reload: () => void;
  readonly busy?: () => boolean;
  readonly defer?: () => boolean;
  readonly stale?: () => void;
}

interface Entry {
  readonly resource: MountedChangeResource;
  readonly pending: ReturnType<typeof signal<boolean>>;
  readonly effect: EffectRef;
}

/** Only resources registered by the currently mounted screen can be refreshed by an event. */
@Injectable({ providedIn: 'root' })
export class ChangeResourcesService {
  private readonly injector = inject(Injector);
  private readonly entries = new Set<Entry>();

  register(resource: MountedChangeResource): () => void {
    const pending = signal(false);
    const entry: Entry = {
      resource,
      pending,
      effect: effect(
        () => {
          if (!pending()) return;
          if (resource.defer?.()) {
            pending.set(false);
            untracked(() => resource.stale?.());
            return;
          }
          if (resource.busy?.()) return;
          pending.set(false);
          untracked(resource.reload);
        },
        { injector: this.injector, manualCleanup: true },
      ),
    };
    this.entries.add(entry);
    return () => {
      this.entries.delete(entry);
      entry.effect.destroy();
    };
  }

  /** The server's `ready` is a resync boundary even if its epoch matches the previous one. */
  ready(): void {
    for (const entry of this.entries) {
      if (this.keys(entry).length > 0) entry.pending.set(true);
    }
  }

  changed(keys: 'ALL' | readonly ChangeKey[]): void {
    for (const entry of this.entries) {
      const mounted = this.keys(entry);
      if (mounted.length > 0 && (keys === 'ALL' || mounted.some((key) => keys.includes(key)))) {
        entry.pending.set(true);
      }
    }
  }
  private keys(entry: Entry): readonly ChangeKey[] {
    return typeof entry.resource.keys === 'function' ? entry.resource.keys() : entry.resource.keys;
  }
}

/** Register a mounted read and release it with its screen. Call in an injection context. */
export function watchChanges(resource: MountedChangeResource): true {
  const unregister = inject(ChangeResourcesService).register(resource);
  inject(DestroyRef).onDestroy(unregister);
  return true;
}
