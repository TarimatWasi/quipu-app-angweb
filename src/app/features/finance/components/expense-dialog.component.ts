import { Component, computed, ElementRef, inject, Injector, signal } from '@angular/core';
import { form, FormField, FormRoot, maxLength, validate } from '@angular/forms/signals';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom, Observable } from 'rxjs';
import { isConcurrentModification } from '@core/http/concurrent-modification';
import { DialogSubmission } from '@shared/forms/dialog-submission';
import { firstError, problem, focusWhenInvalid } from '@shared/forms/form-feedback';
import type { Refusals } from '@shared/forms/form-feedback';
import { DialogFrameComponent } from '@shared/ui/dialog-frame/dialog-frame.component';
import { FieldControlDirective } from '@shared/ui/form-field/field-control.directive';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';
import { CATEGORIES, CATEGORY_LABELS, monthLabel } from '../model/finance';
import type { Expense } from '../model/finance';
import {
  amountProblem,
  categoryProblem,
  draftOfExpense,
  EXPENSE_INTRO,
  MAX_TEXT_LENGTH,
  monthHelp,
  newExpense,
  toExpenseInput,
} from '../model/finance-forms';
import type { ExpenseDraft, ExpenseInput } from '../model/finance-forms';
import { FINANCE_DIALOG_STYLES } from './finance-dialog.styles';
import { refusedField } from './refused-field';

export interface ExpenseDialogData {
  /** The expense being edited, or null for a new one. */
  readonly expense: Expense | null;
  /** The month the balance shows: a new expense starts in it. */
  readonly month: string;
  readonly months: readonly string[];
  /** The call to the BFF; the page owns the data, the dialog only the form. */
  readonly save: (input: ExpenseInput) => Observable<unknown>;
}

/** `saved`, or `conflict` when the expense changed meanwhile (BE-SPR-DAT-13): the page asks to reload. */
export type ExpenseDialogResult = 'saved' | 'conflict';

const ERROR_ID = 'expense-error';

/**
 * A6.1 «Nuevo egreso» and «Editar egreso» (CU-08) on P-16: the category in buttons (D-26), the
 * amount, the month — whose help says which balance it counts in — and an optional description. It
 * checks before calling the BFF (FE-ANG-FRM-03) and says what the BFF refuses with the catalog.
 */
@Component({
  selector: 'app-expense-dialog',
  imports: [DialogFrameComponent, FieldControlDirective, FormField, FormFieldComponent, FormRoot],
  template: `
    <form novalidate [formRoot]="expenseForm">
      <app-dialog-frame [heading]="title">
        <div class="body">
          <p>{{ intro }}</p>
          <app-form-field
            fieldId="expense-category"
            label="Categoría"
            [group]="true"
            [error]="error('category')"
          >
            <div class="quipu-segmented">
              @for (category of categories; track category) {
                <button
                  type="button"
                  [attr.aria-pressed]="draft().category === category ? 'true' : 'false'"
                  [disabled]="saving()"
                  (click)="chooseCategory(category)"
                >
                  {{ labels[category] }}
                </button>
              }
            </div>
          </app-form-field>
          <div class="row">
            <app-form-field
              fieldId="expense-amount"
              label="Monto"
              [money]="true"
              [error]="error('amount')"
            >
              <input
                appFieldControl
                class="quipu-input"
                inputmode="decimal"
                autocomplete="off"
                [formField]="expenseForm.amount"
              />
            </app-form-field>
            <app-form-field
              fieldId="expense-month"
              label="Mes"
              [help]="help()"
              [error]="error('month')"
            >
              <select appFieldControl class="quipu-input" [formField]="expenseForm.month">
                @for (month of data.months; track month) {
                  <option [value]="month">{{ monthLabel(month) }}</option>
                }
              </select>
            </app-form-field>
          </div>
          <app-form-field
            fieldId="expense-description"
            label="Descripción"
            [optional]="true"
            [error]="null"
          >
            <textarea
              appFieldControl
              class="quipu-input"
              rows="2"
              placeholder="Por ejemplo, recibo de luz de octubre"
              [formField]="expenseForm.description"
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
            {{ saveLabel() }}
          </button>
        </ng-container>
      </app-dialog-frame>
    </form>
  `,
  styles: FINANCE_DIALOG_STYLES,
})
export class ExpenseDialogComponent {
  private readonly ref =
    inject<MatDialogRef<ExpenseDialogComponent, ExpenseDialogResult>>(MatDialogRef);
  private readonly submission = new DialogSubmission(this.ref);
  protected readonly data = inject<ExpenseDialogData>(MAT_DIALOG_DATA);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly categories = CATEGORIES;
  protected readonly labels = CATEGORY_LABELS;
  protected readonly intro = EXPENSE_INTRO;
  protected readonly errorId = ERROR_ID;
  protected readonly monthLabel = monthLabel;
  protected readonly title = this.data.expense === null ? 'Nuevo egreso' : 'Editar egreso';
  protected readonly general = signal<string | null>(null);

  protected readonly draft = signal<ExpenseDraft>(
    this.data.expense === null ? newExpense(this.data.month) : draftOfExpense(this.data.expense),
  );

  protected readonly expenseForm = form(
    this.draft,
    (path) => {
      validate(path.category, ({ value }) => problem('category', categoryProblem(value())));
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

  protected readonly saving = computed(() => this.expenseForm().submitting());
  protected readonly help = computed(() => monthHelp('EXP', this.draft().month));
  protected readonly saveLabel = computed(() => {
    if (this.data.expense === null) return this.saving() ? 'Registrando…' : 'Registrar egreso';
    return this.saving() ? 'Guardando…' : 'Guardar cambios';
  });

  /** The text under a field once touched or refused. */
  protected error(name: 'category' | 'amount' | 'month'): string | null {
    return firstError(this.expenseForm[name]);
  }

  protected chooseCategory(category: ExpenseDraft['category']): void {
    this.draft.update((draft) => ({ ...draft, category }));
  }

  protected cancel(): void {
    this.ref.close();
  }

  // The explicit type breaks the circular inference between the form and its submit action.
  private async save(): Promise<Refusals | undefined> {
    return this.submission.run(async () => {
      this.general.set(null);
      const input = toExpenseInput(this.draft());
      if (input === null) return undefined;
      try {
        await firstValueFrom(this.data.save(input), { defaultValue: null });
        this.ref.close('saved');
        return undefined;
      } catch (error: unknown) {
        return this.failed(error);
      }
    });
  }

  private failed(error: unknown): Refusals | undefined {
    if (this.submission.sessionEnded(error)) return undefined;
    if (isConcurrentModification(error)) {
      this.ref.close('conflict');
      return undefined;
    }
    return refusedField({
      error,
      fields: {
        category: this.expenseForm.category,
        amount: this.expenseForm.amount,
        month: this.expenseForm.month,
      },
      host: this.host,
      injector: this.injector,
      errorId: ERROR_ID,
      general: (message) => {
        this.general.set(message);
      },
    });
  }
}

/** Opens A6.1; `afterClosed()` gives `saved`, `conflict` or nothing when it was cancelled. */
export function openExpenseDialog(
  dialog: MatDialog,
  data: ExpenseDialogData,
): MatDialogRef<ExpenseDialogComponent, ExpenseDialogResult> {
  return dialog.open<ExpenseDialogComponent, ExpenseDialogData, ExpenseDialogResult>(
    ExpenseDialogComponent,
    { data, width: 'var(--quipu-dialogo-ancho)', maxWidth: 'calc(100vw - 2rem)' },
  );
}
