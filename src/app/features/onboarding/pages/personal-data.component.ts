import { Component, computed, ElementRef, inject, Injector, signal } from '@angular/core';
import { form, FormRoot } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { callFailure } from '@shared/forms/call-failure';
import { focusFirstProblem, focusWhenInvalid } from '@shared/forms/form-feedback';
import type { Refusals } from '@shared/forms/form-feedback';
import { EmailChangeFieldComponent } from '@shared/forms/email-change-field.component';
import { PersonalDataFieldsComponent } from '@shared/forms/personal-data-fields.component';
import {
  EMPTY_PERSONAL_DATA,
  personalDataRules,
  saveProblem,
  toPersonalData,
  toPersonalDataInput,
} from '@shared/forms/personal-data';
import type { PersonalData } from '@shared/forms/personal-data';
import { LoadErrorComponent } from '@shared/ui/load-error/load-error.component';
import { ToastService } from '@shared/ui/toast/toast.service';
import { SkeletonBlockComponent } from '@shared/ui/skeleton/skeleton-block.component';
import { SkeletonContentDirective } from '@shared/ui/skeleton/skeleton-content.directive';
import { SkeletonFieldsComponent } from '@shared/ui/skeleton/skeleton-fields.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { OnboardingFrameComponent } from '../components/onboarding-frame.component';
import { EMAIL_ADDED_TEXT, EMAIL_CHANGED_TEXT } from '@shared/forms/email-verification';
import { DATA_AFTER, EMERGENCY_HINT } from '../model/onboarding';
import type { OnboardingInProgress } from '../data/onboarding.service';
import { OnboardingPage } from './onboarding-page';
import { ONBOARDING_STYLES } from './onboarding.styles';

const ERROR_ID = 'onboarding-data-error';

/**
 * O1 «Tus datos» (CU-25, RN-33) on the canvas «Onboarding»: the personal data the guest keeps, the
 * same fields, help and checks as H5 (name and phone are required, the rest is not). Saving goes
 * to O2. The BFF always gives the data, with the email of the account (TAR-349), so the form starts
 * from it; the email changes apart, verified with a code, and is not part of what is saved.
 */
@Component({
  selector: 'app-onboarding-personal-data',
  imports: [
    EmailChangeFieldComponent,
    FormRoot,
    LoadErrorComponent,
    OnboardingFrameComponent,
    PersonalDataFieldsComponent,
    SkeletonBlockComponent,
    SkeletonComponent,
    SkeletonContentDirective,
    SkeletonFieldsComponent,
  ],
  templateUrl: './personal-data.component.html',
  styles: ONBOARDING_STYLES,
})
export class OnboardingPersonalDataComponent extends OnboardingPage {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly toasts = inject(ToastService);

  protected readonly errorId = ERROR_ID;
  protected readonly after = DATA_AFTER;
  protected readonly emergencyHint = EMERGENCY_HINT;
  protected readonly generalError = signal<string | null>(null);

  private readonly model = signal<PersonalData>({ ...EMPTY_PERSONAL_DATA });
  protected readonly dataForm = form(
    this.model,
    (path) => {
      personalDataRules(path);
    },
    {
      submission: {
        action: () => this.save(),
        onInvalid: focusWhenInvalid(this.host, this.injector, ERROR_ID),
      },
    },
  );
  protected readonly saving = computed(() => this.dataForm().submitting());

  /** The email the guest has and the one waiting for its code; they change apart from the form. */
  protected readonly email = signal<string | null>(null);
  protected readonly pendingEmail = signal<string | null>(null);
  protected readonly emailClient = this.api.emailVerification;
  /** The form is filled once: a later read (a retry, a step out of order) keeps what is typed. */
  private filled = false;

  constructor() {
    super('PERSONAL_DATA');
  }

  /** Each read says the email; the first one also fills the form with what the BFF has. */
  protected override arrived(state: OnboardingInProgress): void {
    this.email.set(state.personalData.email ?? null);
    this.pendingEmail.set(state.pendingEmail ?? null);
    if (this.filled) return;
    this.filled = true;
    const { name, phone, emergencyContact } = state.personalData;
    this.model.set(toPersonalData({ name, phone, emergencyContact: emergencyContact ?? null }));
  }

  /** The email changed with its code: it shows at once; nothing else of the form changes. */
  protected emailChanged(email: string): void {
    this.toasts.show(this.email() === null ? EMAIL_ADDED_TEXT : EMAIL_CHANGED_TEXT, {
      tone: 'success',
    });
    this.email.set(email);
    this.pendingEmail.set(null);
  }

  /** Runs when the form is valid; a failure comes back as errors, so the form stays editable. */
  private async save(): Promise<Refusals | undefined> {
    this.generalError.set(null);
    try {
      const saved = await firstValueFrom(
        this.api.savePersonalData(toPersonalDataInput(this.model())),
      );
      await this.go(saved.nextStep, saved.personalData.name);
    } catch (error: unknown) {
      return this.saveFailed(error);
    }
    return undefined;
  }

  private saveFailed(error: unknown): Refusals | undefined {
    const failure = callFailure(error);
    if (this.handled(failure)) return undefined;
    const problem = saveProblem(failure);
    focusFirstProblem(this.host, this.injector, ERROR_ID);
    if (problem.place === 'general') {
      this.generalError.set(problem.message);
      return undefined;
    }
    return [{ fieldTree: this.dataForm[problem.field], kind: 'server', message: problem.message }];
  }
}
