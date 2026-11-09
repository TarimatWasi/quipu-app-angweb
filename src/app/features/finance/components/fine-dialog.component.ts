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
import { monthLabel } from '../model/finance';
import {
  amountProblem,
  FINE_GUEST_HELP,
  FINE_INTRO,
  GUEST_GONE_TEXT,
  guestOptions,
  guestProblem,
  MAX_TEXT_LENGTH,
  monthHelp,
  newFine,
  toFineInput,
} from '../model/finance-forms';
import type { FineDraft, FineInput, GuestSummary } from '../model/finance-forms';
import { FINANCE_DIALOG_STYLES } from './finance-dialog.styles';
import { refusedField } from './refused-field';

export interface FineDialogData {
  /** The month the balance shows: a new fine starts in it. */
  readonly month: string;
  readonly months: readonly string[];
  /** Every guest, active or inactive (RN-30). */
  readonly guests: readonly GuestSummary[];
  /** The call to the BFF; the page owns the data, the dialog only the form. */
  readonly save: (input: FineInput) => Observable<unknown>;
}

const ERROR_ID = 'fine-error';

/**
 * A6.3 «Nueva multa» (CU-08, RN-30) on P-16: the guest — active or not, a fine can be charged after
 * it left —, the amount, the month it counts as income in and an optional reason. A fine is not
 * edited: to correct it, it is deleted and registered again. It answers true once registered.
 */
@Component({
  selector: 'app-fine-dialog',
  imports: [DialogFrameComponent, FieldControlDirective, FormField, FormFieldComponent, FormRoot],
  template: `
    <form novalidate [formRoot]="fineForm">
      <app-dialog-frame heading="Nueva multa">
        <div class="body">
          <p>{{ intro }}</p>
          <app-form-field
            fieldId="fine-guest"
            label="Huésped"
            [help]="guestHelp"
            [error]="error('guestId')"
          >
            <select appFieldControl class="quipu-input" [formField]="fineForm.guestId">
              <option value="">Elige un huésped</option>
              @for (option of options; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </app-form-field>
          <div class="row">
            <app-form-field
              fieldId="fine-amount"
              label="Monto"
              [money]="true"
              [error]="error('amount')"
            >
              <input
                appFieldControl
                class="quipu-input"
                inputmode="decimal"
                autocomplete="off"
                [formField]="fineForm.amount"
              />
            </app-form-field>
            <app-form-field fieldId="fine-month" label="Mes" [help]="help()" [error]="null">
              <select appFieldControl class="quipu-input" [formField]="fineForm.month">
                @for (month of data.months; track month) {
                  <option [value]="month">{{ monthLabel(month) }}</option>
                }
              </select>
            </app-form-field>
          </div>
          <app-form-field
            fieldId="fine-description"
            label="Motivo"
            [optional]="true"
            [error]="null"
          >
            <textarea
              appFieldControl
              class="quipu-input"
              rows="2"
              placeholder="Por ejemplo, ruido después de las 23:00"
              [formField]="fineForm.description"
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
            {{ saving() ? 'Registrando…' : 'Registrar multa' }}
          </button>
        </ng-container>
      </app-dialog-frame>
    </form>
  `,
  styles: FINANCE_DIALOG_STYLES,
})
export class FineDialogComponent {
  private readonly ref = inject<MatDialogRef<FineDialogComponent, boolean>>(MatDialogRef);
  private readonly submission = new DialogSubmission(this.ref);
  protected readonly data = inject<FineDialogData>(MAT_DIALOG_DATA);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly intro = FINE_INTRO;
  protected readonly guestHelp = FINE_GUEST_HELP;
  protected readonly errorId = ERROR_ID;
  protected readonly monthLabel = monthLabel;
  protected readonly options = guestOptions(this.data.guests);
  protected readonly general = signal<string | null>(null);

  protected readonly draft = signal<FineDraft>(newFine(this.data.month));

  protected readonly fineForm = form(
    this.draft,
    (path) => {
      validate(path.guestId, ({ value }) => problem('guestId', guestProblem(value())));
      validate(path.amount, ({ value }) => problem('amount', amountProblem(value())));
      maxLength(path.description, MAX_TEXT_LENGTH);
    },
    {
      submission: {
        action: () => this.save(),
        onInvalid: focusWhenInvalid(this.host, this.injector, ERROR_ID),
      },
    },
  );

  protected readonly saving = computed(() => this.fineForm().submitting());
  protected readonly help = computed(() => monthHelp('FIN', this.draft().month));

  protected error(name: 'guestId' | 'amount'): string | null {
    return firstError(this.fineForm[name]);
  }

  protected cancel(): void {
    this.ref.close();
  }

  // The explicit type breaks the circular inference between the form and its submit action.
  private async save(): Promise<Refusals | undefined> {
    return this.submission.run(async () => {
      this.general.set(null);
      const input = toFineInput(this.draft());
      if (input === null) return undefined;
      try {
        await firstValueFrom(this.data.save(input), { defaultValue: null });
        this.ref.close(true);
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
      fields: { guestId: this.fineForm.guestId, amount: this.fineForm.amount },
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

/** Opens A6.3; `afterClosed()` gives true once the fine is registered. */
export function openFineDialog(
  dialog: MatDialog,
  data: FineDialogData,
): MatDialogRef<FineDialogComponent, boolean> {
  return dialog.open<FineDialogComponent, FineDialogData, boolean>(FineDialogComponent, {
    data,
    width: 'var(--quipu-dialogo-ancho)',
    maxWidth: 'calc(100vw - 2rem)',
  });
}
