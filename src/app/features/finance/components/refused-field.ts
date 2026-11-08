import { ElementRef, Injector } from '@angular/core';
import { FieldTree } from '@angular/forms/signals';
import { bodyCodeOf, toBffError } from '@core/http/bff-error';
import { focusFirstProblem } from '@shared/forms/form-feedback';
import type { Refusals } from '@shared/forms/form-feedback';
import { refusal } from '../model/finance-forms';

/**
 * A refusal of the BFF in a dialog of Finanzas (TAR-323): under the field it points at, or, when it
 * points at none of them, as the general error of the dialog. The focus goes to the first problem
 * either way. The three dialogs (expense, fine, refund) answered it in the same way, each its own.
 */
export function refusedField<Field extends string>(args: {
  readonly error: unknown;
  /** The fields of the form a refusal may point at. */
  readonly fields: Readonly<Record<Field, FieldTree<string>>>;
  readonly host: ElementRef<HTMLElement>;
  readonly injector: Injector;
  /** The id of the general error, where the focus goes when no field is at fault. */
  readonly errorId: string;
  readonly general: (message: string) => void;
}): Refusals | undefined {
  const { error, fields } = args;
  const refused = refusal(bodyCodeOf(error), toBffError(error).field);
  focusFirstProblem(args.host, args.injector, args.errorId);
  if (refused === null || !(refused.field in fields)) {
    args.general(toBffError(error).message);
    return undefined;
  }
  return [{ fieldTree: fields[refused.field as Field], kind: 'server', message: refused.message }];
}
