import { ElementRef, Injector, WritableSignal } from '@angular/core';
import { FieldTree } from '@angular/forms/signals';
import type { BffError } from '@core/http/bff-error';
import { focusFirstProblem } from '@shared/forms/form-feedback';
import type { Refusals } from '@shared/forms/form-feedback';

/**
 * How a page that opens from an emailed link answers the BFF (TAR-325): a refusal that points at a
 * field of the form (a weak password, a wrong name) goes under it and does not use up the link; any
 * other goes above the form, and if it says the code or token cannot be used the only way forward is
 * a new link. The focus goes to the first problem either way. Reset, activate an administrator and
 * activate an access answered it in the same way, each its own.
 */
export function linkFailure(args: {
  readonly error: BffError;
  /** The fields of the form a refusal may point at. */
  readonly fields: Readonly<Record<string, FieldTree<string>>>;
  readonly errorId: string;
  readonly host: ElementRef<HTMLElement>;
  readonly injector: Injector;
  readonly serverError: WritableSignal<string | null>;
  readonly rejected: WritableSignal<boolean>;
}): Refusals | undefined {
  const { code, message, field } = args.error;
  focusFirstProblem(args.host, args.injector, args.errorId);
  const fieldTree = field === undefined ? undefined : args.fields[field];
  if (fieldTree !== undefined) return [{ fieldTree, kind: 'server', message }];
  args.rejected.set(code === 'AUTH_INVALID_OR_EXPIRED_CODE');
  args.serverError.set(message);
  return undefined;
}
