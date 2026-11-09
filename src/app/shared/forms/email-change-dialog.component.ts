import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  signal,
} from '@angular/core';
import {
  email,
  form,
  FormField,
  FormRoot,
  maxLength,
  required,
  validate,
} from '@angular/forms/signals';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { Countdown } from '@shared/data/countdown';
import { DialogFrameComponent } from '@shared/ui/dialog-frame/dialog-frame.component';
import { FieldControlDirective } from '@shared/ui/form-field/field-control.directive';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';
import { callFailure } from './call-failure';
import { EMAIL_TEXT, MAX_EMAIL_LENGTH } from './contact-rules';
import { DialogSubmission } from './dialog-submission';
import {
  ADD_EMAIL_LABEL,
  CHANGE_EMAIL_LABEL,
  CODE_LABEL,
  CODE_SENT_TEXT,
  codeError,
  codeLead,
  CONFIRM_LABEL,
  CONFIRMING_LABEL,
  confirmProblem,
  EMAIL_REQUIRED_TEXT,
  NEW_EMAIL_LABEL,
  normalizeCode,
  OTHER_EMAIL_LABEL,
  REQUEST_LEAD,
  requestProblem,
  RESEND_LABEL,
  RESEND_WAIT_SECONDS,
  resendWaitLabel,
  SEND_CODE_LABEL,
  SENDING_CODE_LABEL,
} from './email-verification';
import type { EmailVerificationClient, VerificationProblem } from './email-verification';
import { firstError, focusFirstProblem, focusWhenInvalid, problem } from './form-feedback';
import type { Refusals } from './form-feedback';

export interface EmailChangeData {
  /** The email the guest has now; null without one («Agregar correo»). */
  readonly current: string | null;
  /** The address a code was already sent to (`pendingEmail`): the dialog opens on the code. */
  readonly pending: string | null;
  /** The calls of the path the screen works under (guest, temporary guest or onboarding). */
  readonly client: EmailVerificationClient;
}

const LEAD_ID = 'email-change-lead';
const ERROR_ID = 'email-change-error';

/**
 * «Cambiar correo» (TAR-349) on P-16, in two steps: the new address, which gets a code of 6
 * digits, and the code, which changes the email. «Reenviar código» waits the 60 s the BFF asks
 * between codes; «Usar otro correo» goes back. Checks run before calling the BFF (FE-ANG-FRM-03);
 * a failure of a field goes under it, anything else above the buttons. Answers the new email once
 * it changed; closing it before leaves the email as it was.
 */
@Component({
  selector: 'app-email-change-dialog',
  imports: [DialogFrameComponent, FieldControlDirective, FormField, FormFieldComponent, FormRoot],
  template: `
    @if (sentTo(); as address) {
      <form novalidate [formRoot]="codeForm" [attr.aria-describedby]="error() ? errorId : null">
        <app-dialog-frame [heading]="title">
          <div class="body">
            <p [id]="leadId">{{ codeLead(address) }}</p>
            <app-form-field fieldId="email-change-code" [label]="codeLabel" [error]="codeError()">
              <input
                appFieldControl
                class="quipu-input code"
                type="text"
                inputmode="numeric"
                autocomplete="one-time-code"
                aria-required="true"
                [formField]="codeForm.code"
              />
            </app-form-field>
            <div class="again">
              <button
                class="quipu-button quipu-button--tertiary"
                type="button"
                [disabled]="busy() || wait.active()"
                (click)="resend()"
              >
                {{ wait.active() ? resendWaitLabel(wait.remaining()) : resendLabel }}
              </button>
              <button
                class="quipu-button quipu-button--tertiary"
                type="button"
                [disabled]="busy()"
                (click)="otherEmail()"
              >
                {{ otherEmailLabel }}
              </button>
            </div>
            @if (notice(); as message) {
              <p class="notice" role="status">{{ message }}</p>
            }
            @if (error(); as message) {
              <p class="quipu-alert" role="alert" tabindex="-1" [id]="errorId">{{ message }}</p>
            }
          </div>
          <ng-container dialogActions>
            <button
              class="quipu-button quipu-button--tertiary"
              type="button"
              [disabled]="busy()"
              (click)="cancel()"
            >
              Cancelar
            </button>
            <button class="quipu-button quipu-button--primary" type="submit" [disabled]="busy()">
              {{ confirming() ? confirmingLabel : confirmLabel }}
            </button>
          </ng-container>
        </app-dialog-frame>
      </form>
    } @else {
      <form novalidate [formRoot]="emailForm" [attr.aria-describedby]="error() ? errorId : null">
        <app-dialog-frame [heading]="title">
          <div class="body">
            <p [id]="leadId">{{ requestLead }}</p>
            <app-form-field
              fieldId="email-change-email"
              [label]="emailLabel"
              [error]="emailError()"
            >
              <input
                appFieldControl
                class="quipu-input"
                type="email"
                inputmode="email"
                autocomplete="email"
                aria-required="true"
                [formField]="emailForm.email"
              />
            </app-form-field>
            @if (error(); as message) {
              <p class="quipu-alert" role="alert" tabindex="-1" [id]="errorId">{{ message }}</p>
            }
          </div>
          <ng-container dialogActions>
            <button
              class="quipu-button quipu-button--tertiary"
              type="button"
              [disabled]="busy()"
              (click)="cancel()"
            >
              Cancelar
            </button>
            <button
              class="quipu-button quipu-button--primary"
              type="submit"
              [disabled]="busy() || wait.active()"
            >
              {{
                requesting()
                  ? sendingLabel
                  : wait.active()
                    ? resendWaitLabel(wait.remaining())
                    : sendLabel
              }}
            </button>
          </ng-container>
        </app-dialog-frame>
      </form>
    }
  `,
  styles: `
    .body {
      display: grid;
      gap: 1rem;
    }
    p {
      margin: 0;
    }
    .code {
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.25em;
    }
    .again {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .notice {
      color: var(--quipu-tinta-secundaria);
    }
  `,
})
export class EmailChangeDialogComponent {
  private readonly ref = inject<MatDialogRef<EmailChangeDialogComponent, string>>(MatDialogRef);
  private readonly submission = new DialogSubmission(this.ref);
  private readonly data = inject<EmailChangeData>(MAT_DIALOG_DATA);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly title = this.data.current === null ? ADD_EMAIL_LABEL : CHANGE_EMAIL_LABEL;
  protected readonly requestLead = REQUEST_LEAD;
  protected readonly emailLabel = NEW_EMAIL_LABEL;
  protected readonly codeLabel = CODE_LABEL;
  protected readonly sendLabel = SEND_CODE_LABEL;
  protected readonly sendingLabel = SENDING_CODE_LABEL;
  protected readonly confirmLabel = CONFIRM_LABEL;
  protected readonly confirmingLabel = CONFIRMING_LABEL;
  protected readonly resendLabel = RESEND_LABEL;
  protected readonly otherEmailLabel = OTHER_EMAIL_LABEL;
  protected readonly codeLead = codeLead;
  protected readonly resendWaitLabel = resendWaitLabel;
  protected readonly leadId = LEAD_ID;
  protected readonly errorId = ERROR_ID;

  /** The address the last code went to; null while on the first step. */
  protected readonly sentTo = signal<string | null>(this.data.pending);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly resending = signal(false);
  /** The 60 s between two codes, from the last one sent. */
  protected readonly wait = new Countdown();

  private readonly emailModel = signal({ email: this.data.pending ?? '' });
  protected readonly emailForm = form(
    this.emailModel,
    (path) => {
      required(path.email, { message: EMAIL_REQUIRED_TEXT });
      email(path.email, { message: EMAIL_TEXT });
      maxLength(path.email, MAX_EMAIL_LENGTH, { message: EMAIL_TEXT });
    },
    {
      submission: {
        action: () => this.request(),
        onInvalid: focusWhenInvalid(this.host, this.injector, ERROR_ID),
      },
    },
  );

  private readonly codeModel = signal({ code: '' });
  protected readonly codeForm = form(
    this.codeModel,
    (path) => {
      validate(path.code, ({ value }) => problem('code', codeError(value())));
    },
    {
      submission: {
        action: () => this.confirm(),
        onInvalid: focusWhenInvalid(this.host, this.injector, ERROR_ID),
      },
    },
  );

  protected readonly emailError = computed(() => firstError(this.emailForm.email));
  protected readonly codeError = computed(() => firstError(this.codeForm.code));
  protected readonly requesting = computed(() => this.emailForm().submitting());
  protected readonly confirming = computed(() => this.codeForm().submitting());
  protected readonly busy = computed(
    () => this.requesting() || this.confirming() || this.resending(),
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.wait.stop();
    });
  }

  protected cancel(): void {
    this.ref.close();
  }

  /** Back to the first step, with the address that was used, to fix it or write another. */
  protected otherEmail(): void {
    this.error.set(null);
    this.notice.set(null);
    this.emailModel.set({ email: this.sentTo() ?? '' });
    this.sentTo.set(null);
    this.focus('#email-change-email');
  }

  /** «Reenviar código»: a new code to the same address; the one before stops working. */
  protected async resend(): Promise<void> {
    const address = this.sentTo();
    if (address === null || this.busy() || this.wait.active()) return;
    this.resending.set(true);
    this.error.set(null);
    this.notice.set(null);
    try {
      await this.submission.run(async () => {
        try {
          await firstValueFrom(this.data.client.request(address), { defaultValue: null });
          this.wait.start(RESEND_WAIT_SECONDS);
          this.codeModel.set({ code: '' });
          this.notice.set(CODE_SENT_TEXT);
        } catch (error: unknown) {
          if (this.submission.sessionEnded(error)) return;
          this.show(requestProblem(callFailure(error)));
        }
      });
    } finally {
      this.resending.set(false);
    }
  }

  /** Runs when the address is valid; a failure comes back as errors, so the step stays editable. */
  // The explicit type breaks the circular inference between the form and its submit action.
  private async request(): Promise<Refusals | undefined> {
    return this.submission.run(async () => {
      this.error.set(null);
      const address = this.emailModel().email.trim();
      try {
        await firstValueFrom(this.data.client.request(address), { defaultValue: null });
        this.wait.start(RESEND_WAIT_SECONDS);
        this.codeModel.set({ code: '' });
        this.codeForm.code().reset();
        this.sentTo.set(address);
        this.focus('#email-change-code');
        return undefined;
      } catch (error: unknown) {
        if (this.submission.sessionEnded(error)) return undefined;
        const found = requestProblem(callFailure(error));
        if (found.place === 'field') {
          focusFirstProblem(this.host, this.injector, ERROR_ID);
          return [{ fieldTree: this.emailForm.email, kind: 'server', message: found.message }];
        }
        this.show(found);
        return undefined;
      }
    });
  }

  private async confirm(): Promise<Refusals | undefined> {
    return this.submission.run(async () => {
      this.error.set(null);
      this.notice.set(null);
      const address = this.sentTo();
      if (address === null) return undefined;
      try {
        await firstValueFrom(this.data.client.confirm(normalizeCode(this.codeModel().code)), {
          defaultValue: null,
        });
        this.ref.close(address);
        return undefined;
      } catch (error: unknown) {
        if (this.submission.sessionEnded(error)) return undefined;
        const found = confirmProblem(callFailure(error));
        if (found.place === 'field') {
          focusFirstProblem(this.host, this.injector, ERROR_ID);
          return [{ fieldTree: this.codeForm.code, kind: 'server', message: found.message }];
        }
        this.show(found);
        return undefined;
      }
    });
  }

  /** A failure above the buttons; a wait the BFF reported starts the countdown of «Reenviar». */
  private show(found: VerificationProblem): void {
    if (found.waitSeconds !== undefined) this.wait.start(found.waitSeconds);
    this.error.set(found.message);
    focusFirstProblem(this.host, this.injector, ERROR_ID);
  }

  private focus(selector: string): void {
    afterNextRender(
      () => {
        this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus();
      },
      { injector: this.injector },
    );
  }
}

/** Opens «Cambiar correo»; `afterClosed()` gives the new email, or nothing when it did not change. */
export function openEmailChangeDialog(
  dialog: MatDialog,
  data: EmailChangeData,
): MatDialogRef<EmailChangeDialogComponent, string> {
  return dialog.open<EmailChangeDialogComponent, EmailChangeData, string>(
    EmailChangeDialogComponent,
    { ariaDescribedBy: LEAD_ID, data, width: '30rem', maxWidth: 'calc(100vw - 2rem)' },
  );
}
