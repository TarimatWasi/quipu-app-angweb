import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { defer, Observable, of, Subscription, switchMap, timer } from 'rxjs';
import type { MockCall } from './mock-bff';
import { concurrentModification, failure } from './mock-reply';
import { readMockSetting, writeMockSetting } from './mock-storage';
import type { MockReply } from './mock-types';

export const MOCK_TARGETS = [
  { key: 'summary', label: 'Resumen de pagos' },
  { key: 'payment-list', label: 'Pagos: primera página' },
  { key: 'payment-more', label: 'Pagos: cargar más' },
  { key: 'payment-detail', label: 'Detalle de pago' },
  { key: 'payment-write', label: 'Guardar / resolver pagos' },
  { key: 'reads', label: 'Otras lecturas' },
  { key: 'writes', label: 'Otras escrituras' },
] as const;
export type MockTarget = (typeof MOCK_TARGETS)[number]['key'];
export type RequestMode = 'normal' | 'hold' | 'slow' | 'fail-next';
export type FailureKind = 'server' | 'conflict' | 'validation' | 'storage';
interface RequestRule {
  readonly mode: RequestMode;
  readonly failure: FailureKind;
}
export interface PendingMockRequest {
  readonly id: number;
  readonly label: string;
  readonly method: string;
  readonly path: string;
}

export function forcedFailure(kind: FailureKind): MockReply {
  switch (kind) {
    case 'conflict':
      return concurrentModification();
    case 'validation':
      return failure(400, 'VALIDATION_ERROR', 'Revisa los datos ingresados', 'proofs');
    case 'storage':
      return failure(
        503,
        'FILE_STORAGE_UNAVAILABLE',
        'No se pudo guardar el archivo. Inténtalo de nuevo.',
      );
    default:
      return failure(500, 'UNEXPECTED_ERROR', 'Ocurrió un error inesperado. Inténtalo de nuevo.');
  }
}

/** Selective controls exclude authentication, so preparing a page never prevents signing in. */
function targetOf(call: MockCall): MockTarget | null {
  if (call.path.startsWith('/bff/auth/')) return null;
  if (call.method === 'GET') {
    if (call.path === '/bff/admin/dashboard') return 'summary';
    if (call.path === '/bff/admin/payments')
      return call.query.has('after') ? 'payment-more' : 'payment-list';
    if (/^\/bff\/admin\/payments\/[^/]+$/.test(call.path)) return 'payment-detail';
    return 'reads';
  }
  return call.path.startsWith('/bff/admin/payments') || call.path.startsWith('/bff/guest/payments')
    ? 'payment-write'
    : 'writes';
}

/** Stores only validated settings; never request payloads, files or real session information. */
function storedRules(): Partial<Record<MockTarget, RequestRule>> {
  try {
    const parsed: unknown = JSON.parse(readMockSetting('quipu-mock:requests') ?? '{}');
    if (typeof parsed !== 'object' || parsed === null) return {};
    const result: Partial<Record<MockTarget, RequestRule>> = {};
    for (const { key } of MOCK_TARGETS) {
      const rule: unknown = (parsed as Record<string, unknown>)[key];
      if (typeof rule !== 'object' || rule === null || !('mode' in rule) || !('failure' in rule))
        continue;
      if (!['normal', 'hold', 'slow', 'fail-next'].includes(String(rule.mode))) continue;
      if (!['server', 'conflict', 'validation', 'storage'].includes(String(rule.failure))) continue;
      result[key] = { mode: rule.mode as RequestMode, failure: rule.failure as FailureKind };
    }
    return result;
  } catch {
    return {};
  }
}

@Injectable({ providedIn: 'root' })
export class MockRequestControls {
  private sequence = 0;
  private readonly rulesValue = signal(storedRules());
  private readonly pendingValue = signal<readonly PendingMockRequest[]>([]);
  private readonly releases = new Map<number, (error?: FailureKind) => void>();
  private readonly cancellations = new Map<number, () => void>();
  readonly rules = this.rulesValue.asReadonly();
  readonly pending = this.pendingValue.asReadonly();
  readonly storageAvailable = signal(true);

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.cancelAll();
    });
  }

  configure(target: MockTarget, mode: RequestMode, kind: FailureKind): void {
    this.rulesValue.update((rules) => ({ ...rules, [target]: { mode, failure: kind } }));
    this.persist();
  }

  resolve(id: number, error?: FailureKind): void {
    this.releases.get(id)?.(error);
  }

  reset(): void {
    this.cancelAll();
    this.rulesValue.set({});
    this.persist();
  }

  cancelAll(): void {
    for (const cancel of [...this.cancellations.values()]) cancel();
  }

  dispatch(call: MockCall, run: () => Promise<MockReply>, latency: number): Observable<MockReply> {
    return new Observable((subscriber) => {
      const target = targetOf(call);
      const rule = target === null ? undefined : this.rules()[target];
      const id = ++this.sequence;
      let work: Subscription | undefined;
      this.cancellations.set(id, () => {
        subscriber.complete();
      });
      const launch = (error?: FailureKind) => {
        this.forget(id);
        work = timer(rule?.mode === 'slow' ? 9_000 : latency)
          .pipe(switchMap(() => (error === undefined ? defer(run) : of(forcedFailure(error)))))
          .subscribe(subscriber);
      };
      if (rule?.mode === 'hold' && target !== null) {
        const label = MOCK_TARGETS.find((item) => item.key === target)?.label ?? target;
        this.pendingValue.update((items) => [
          ...items,
          { id, label, method: call.method, path: call.path },
        ]);
        this.releases.set(id, launch);
      } else {
        if (rule?.mode === 'fail-next' && target !== null)
          this.configure(target, 'normal', rule.failure);
        launch(rule?.mode === 'fail-next' ? rule.failure : undefined);
      }
      return () => {
        work?.unsubscribe();
        this.forget(id);
        this.cancellations.delete(id);
      };
    });
  }

  private forget(id: number): void {
    this.releases.delete(id);
    this.pendingValue.update((items) => items.filter((item) => item.id !== id));
  }

  private persist(): void {
    this.storageAvailable.set(
      writeMockSetting('quipu-mock:requests', JSON.stringify(this.rules())),
    );
  }
}
