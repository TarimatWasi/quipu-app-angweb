import { afterNextRender, ElementRef, Injector } from '@angular/core';
import { FieldTree } from '@angular/forms/signals';

/** Errors show once the user touched the field or tried to submit (which touches every field). */
export function firstError(field: FieldTree<string>): string | null {
  const state = field();
  return state.touched() ? (state.errors()[0]?.message ?? null) : null;
}

/**
 * After a failed submit the focus goes to the first invalid field, or to the general error
 * (`generalErrorId`) when no field is at fault. Waiting for the next render makes sure the error is
 * already on screen.
 */
export function focusFirstProblem(
  host: ElementRef<HTMLElement>,
  injector: Injector,
  generalErrorId: string,
): void {
  afterNextRender(
    () => {
      const root = host.nativeElement;
      const target =
        root.querySelector<HTMLElement>('[aria-invalid="true"]') ??
        root.querySelector<HTMLElement>(`#${generalErrorId}`);
      target?.focus();
    },
    { injector },
  );
}
