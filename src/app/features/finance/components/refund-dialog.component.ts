import { Component, computed, ElementRef, inject, Injector, signal } from '@angular/core';
import { form, FormField, FormRoot, maxLength, validate } from '@angular/forms/signals';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom, Observable } from 'rxjs';
import { DialogSubmission } from '@shared/forms/dialog-submission';
import { firstError, problem, focusWhenInvalid } from '@shared/forms/form-feedback';
import type { Refusals } from '@shared/forms/form-feedback';
import { DialogFrameComponent } from '@shared/ui/dialog-frame/dialog-frame.component';
import { FieldControlDirective } from '@shared/ui/form-field/field-control.directive';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';
import type { PendingCredit, Refund } from '../model/finance';
import {
  creditOf,
  creditOptions,
  dateProblem,
  guestProblem,
  MAX_METHOD_LENGTH,
  MAX_TEXT_LENGTH,
  methodProblem,
  GUEST_GONE_TEXT,
  METHOD_SHORTCUTS,
  newRefund,
  refundAmountHelp,
  refundAmountProblem,
  refundDateHelp,
  refundGuestHelp,
  toRefundInput,
} from '../model/finance-forms';
import type { RefundDraft, RefundInput } from '../model/finance-forms';
import { FINANCE_DIALOG_STYLES } from './finance-dialog.styles';
import { refusedField } from './refused-field';

export interface RefundDialogData {
  /** The guests with credit to refund; the one chosen first comes in `guestId`. */
  readonly credits: readonly PendingCredit[];
  readonly guestId: string;
  /** The day in Lima, yyyy-mm-dd: the refund is not dated after it (RN-39). */
  readonly today: string;
  /** The call to the BFF; the page owns the data, the dialog only the form. */
  readonly save: (input: RefundInput) => Observable<Refund>;
}

const ERROR_ID = 'refund-error';

/**
 * A6.5 «Registrar devolución» (RF-24, RN-38, RN-39) on P-16: the guest — chosen from the notice or
 * among those with credit —, the amount, which starts as all its credit and can be less, the date
 * (never future), how it was returned and an optional note. It answers the refund once registered.
 */
@Component({
  selector: 'app-refund-dialog',
  imports: [DialogFrameComponent, FieldControlDirective, FormField, FormFieldComponent, FormRoot],
  template: `
    <form novalidate [formRoot]="refundForm">
      <app-dialog-frame heading="Registrar devolución">
        <div class="body">
          <app-form-field
            fieldId="refund-guest"
            label="Huésped"
            [help]="guestHelp()"
            [error]="error('guestId')"
          >
            <select
              appFieldControl
              class="quipu-input"
              [formField]="refundForm.guestId"
              (change)="pickGuest(valueOf($event))"
            >
              <option value="">Elige un huésped</option>
              @for (option of options; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </app-form-field>
          <div class="row">
            <app-form-field
              fieldId="refund-amount"
              label="Monto"
              [money]="true"
              [help]="amountHelp()"
              [error]="error('amount')"
            >
              <input
                appFieldControl
                class="quipu-input"
                inputmode="decimal"
                autocomplete="off"
                [formField]="refundForm.amount"
              />
            </app-form-field>
            <app-form-field
              fieldId="refund-date"
              label="Fecha"
              [help]="dateHelp()"
              [error]="error('date')"
            >
              <input
                appFieldControl
                class="quipu-input"
                type="date"
                [max]="data.today"
                [formField]="refundForm.date"
              />
            </app-form-field>
          </div>
          <app-form-field
            fieldId="refund-method"
            label="Medio de devolución"
            [error]="error('method')"
          >
            <input
              appFieldControl
              class="quipu-input"
              autocomplete="off"
              placeholder="Por ejemplo, Yape"
              [formField]="refundForm.method"
            />
            <div class="quipu-segmented" role="group" aria-label="Elegir un medio">
              @for (shortcut of shortcuts; track shortcut) {
                <button
                  type="button"
                  [attr.aria-pressed]="draft().method === shortcut ? 'true' : 'false'"
                  [disabled]="saving()"
                  (click)="chooseMethod(shortcut)"
                >
                  {{ shortcut }}
                </button>
              }
            </div>
          </app-form-field>
          <app-form-field fieldId="refund-note" label="Nota" [optional]="true" [error]="null">
            <textarea
              appFieldControl
              class="quipu-input"
              rows="2"
              placeholder="Por ejemplo, número de operación"
              [formField]="refundForm.note"
            ></textarea>
          </app-form-field>
          @if (general(); as message) {
            <p class="quipu-alert" role="alert" tabindex="-1" [id]="errorId">{{ message }}</p>
          }
        </div>
        <ng-container dialogActions>
          <button
            class="quipu-button quipu-button--tertiary"
            type="button"
            [disabled]="saving()"
            (click)="cancel()"
          >
            Cancelar
          </button>
          <button class="quipu-button quipu-button--primary" type="submit" [disabled]="saving()">
            {{ saving() ? 'Registrando…' : 'Registrar devolución' }}
          </button>
        </ng-container>
      </app-dialog-frame>
    </form>
  `,
  styles: FINANCE_DIALOG_STYLES,
})
export class RefundDialogComponent {
  private readonly ref = inject<MatDialogRef<RefundDialogComponent, Refund>>(MatDialogRef);
  private readonly submission = new DialogSubmission(this.ref);
  protected readonly data = inject<RefundDialogData>(MAT_DIALOG_DATA);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly errorId = ERROR_ID;
  protected readonly shortcuts = METHOD_SHORTCUTS;
  protected readonly options = creditOptions(this.data.credits);
  protected readonly general = signal<string | null>(null);

  protected readonly draft = signal<RefundDraft>(
    newRefund(creditOf(this.data.credits, this.data.guestId), this.data.today),
  );
  private readonly credit = computed(() => creditOf(this.data.credits, this.draft().guestId));

  protected readonly refundForm = form(
    this.draft,
    (path) => {
      validate(path.guestId, ({ value }) => problem('guestId', guestProblem(value())));
      validate(path.amount, ({ value }) =>
        problem('amount', refundAmountProblem(value(), this.credit())),
      );
      validate(path.date, ({ value }) => problem('date', dateProblem(value(), this.data.today)));
      validate(path.method, ({ value }) => problem('method', methodProblem(value())));
      maxLength(path.method, MAX_METHOD_LENGTH);
      maxLength(path.note, MAX_TEXT_LENGTH);
    },
    {
      submission: {
        action: () => this.save(),
        onInvalid: focusWhenInvalid(this.host, this.injector, ERROR_ID),
      },
    },
  );

  protected readonly saving = computed(() => this.refundForm().submitting());
  protected readonly guestHelp = computed(() => refundGuestHelp(this.credit()));
  protected readonly amountHelp = computed(() => refundAmountHelp(this.credit()));
  protected readonly dateHelp = computed(() => refundDateHelp(this.draft().date));

  protected error(name: 'guestId' | 'amount' | 'date' | 'method'): string | null {
    return firstError(this.refundForm[name]);
  }

  protected valueOf(event: Event): string {
    return event.target instanceof HTMLSelectElement ? event.target.value : '';
  }

  protected chooseMethod(method: string): void {
    this.draft.update((draft) => ({ ...draft, method }));
  }

  protected cancel(): void {
    this.ref.close();
  }

  /** Choosing another guest brings all its credit into the amount, which can then be lowered. */
  protected pickGuest(guestId: string): void {
    const credit = creditOf(this.data.credits, guestId);
    this.draft.update((draft) => ({
      ...draft,
      guestId,
      amount: credit === undefined ? '' : credit.amount.toFixed(2),
    }));
  }

  // The explicit type breaks the circular inference between the form and its submit action.
  private async save(): Promise<Refusals | undefined> {
    return this.submission.run(async () => {
      this.general.set(null);
      const input = toRefundInput(this.draft(), this.credit(), this.data.today);
      if (input === null) return undefined;
      try {
        this.ref.close(await firstValueFrom(this.data.save(input)));
        return undefined;
      } catch (error: unknown) {
        return this.failed(error);
      }
    });
  }

  private failed(error: unknown): Refusals | undefined {
    if (this.submission.sessionEnded(error)) return undefined;
    return refusedField({
      error,
      fields: {
        guestId: this.refundForm.guestId,
        amount: this.refundForm.amount,
        date: this.refundForm.date,
        method: this.refundForm.method,
      },
      host: this.host,
      injector: this.injector,
      errorId: ERROR_ID,
      gone: GUEST_GONE_TEXT,
      general: (message) => {
        this.general.set(message);
      },
    });
  }
}

/** Opens A6.5; `afterClosed()` gives the refund registered, or nothing when it was cancelled. */
export function openRefundDialog(
  dialog: MatDialog,
  data: RefundDialogData,
): MatDialogRef<RefundDialogComponent, Refund> {
  return dialog.open<RefundDialogComponent, RefundDialogData, Refund>(RefundDialogComponent, {
    data,
    width: 'var(--quipu-dialogo-ancho)',
    maxWidth: 'calc(100vw - 2rem)',
  });
}
