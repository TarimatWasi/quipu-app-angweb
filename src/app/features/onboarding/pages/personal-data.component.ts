import { Component, computed, ElementRef, inject, Injector, signal } from '@angular/core';
import { form, FormRoot } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { callFailure } from '@shared/forms/call-failure';
import { focusFirstProblem, focusWhenInvalid } from '@shared/forms/form-feedback';
import type { Refusals } from '@shared/forms/form-feedback';
import { PersonalDataFieldsComponent } from '@shared/forms/personal-data-fields.component';
import {
  EMPTY_PERSONAL_DATA,
  personalDataRules,
  saveProblem,
  toPersonalDataInput,
} from '@shared/forms/personal-data';
import type { PersonalData } from '@shared/forms/personal-data';
import { LoadErrorComponent } from '@shared/ui/load-error/load-error.component';
import { SkeletonBlockComponent } from '@shared/ui/skeleton/skeleton-block.component';
import { SkeletonContentDirective } from '@shared/ui/skeleton/skeleton-content.directive';
import { SkeletonFieldsComponent } from '@shared/ui/skeleton/skeleton-fields.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { OnboardingFrameComponent } from '../components/onboarding-frame.component';
import { DATA_AFTER } from '../model/onboarding';
import { OnboardingPage } from './onboarding-page';
import { ONBOARDING_STYLES } from './onboarding.styles';

const ERROR_ID = 'onboarding-data-error';

/**
 * O1 «Tus datos» (CU-25, RN-33) on the canvas «Onboarding»: the personal data the guest keeps, the
 * same fields, help and checks as H5 (name and phone are required, the rest is not). Saving goes
 * to O2. A guest that comes back finds the step still empty: the BFF only returns the data once saved.
 */
@Component({
  selector: 'app-onboarding-personal-data',
  imports: [
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

  protected readonly errorId = ERROR_ID;
  protected readonly after = DATA_AFTER;
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

  /** The read starts with the page, not in a hook (Sonar S7059). */
  protected readonly started = this.load();

  constructor() {
    super('PERSONAL_DATA');
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
