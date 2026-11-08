import { afterNextRender, ElementRef, Injector } from '@angular/core';
import { FieldTree } from '@angular/forms/signals';

/** What a form of signals takes as the errors of the server: one under the field it refuses. */
export type Refusals = { fieldTree: FieldTree<string>; kind: 'server'; message: string }[];

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

/**
 * What a form does when it is submitted with problems (`onInvalid`): the focus goes to the first
 * invalid field, or to the general error (TAR-325). Was a three-line arrow in 17 forms.
 */
export function focusWhenInvalid(
  host: ElementRef<HTMLElement>,
  injector: Injector,
  generalErrorId: string,
): () => void {
  return () => {
    focusFirstProblem(host, injector, generalErrorId);
  };
}

/** The error a validator gives for a field: its kind and message, or nothing when it has none. */
export function problem(
  kind: string,
  message: string | null,
): { kind: string; message: string } | undefined {
  return message === null ? undefined : { kind, message };
}
