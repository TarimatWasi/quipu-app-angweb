import { computed, DestroyRef, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AsyncContentState } from '@shared/data/async-content';
import type { CallFailure } from '@shared/forms/call-failure';
import { openPaymentNoticeDialog } from '@shared/payments/payment-notice-dialog.component';
import { OnboardingService } from '../data/onboarding.service';
import type { OnboardingInProgress } from '../data/onboarding.service';
import {
  COMPLETE_BUTTON,
  COMPLETE_MESSAGES,
  COMPLETE_TITLE,
  HOME_PATH,
  isAlreadyCompleted,
  isOutOfOrder,
  LEAVE_NOTE,
  LOAD_TEXT,
  registrationSteps,
  STEP_PATHS,
} from '../model/onboarding';
import type { OnboardingStep } from '../model/onboarding';

/**
 * What O1, O2 and O3 share (TAR-320: said once): the read of the registration, which sends the guest
 * to the step that comes first (the BFF decides, RN-33) or home when there is nothing left; the
 * «Tu registro ya está completo» of a registration finished in another window; and the steps of
 * the frame. A page only says its step and what it saves.
 */
export abstract class OnboardingPage {
  protected readonly api = inject(OnboardingService);
  protected readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  protected readonly loaded = new AsyncContentState<OnboardingInProgress>();
  protected readonly view = this.loaded.state;
  protected readonly retrying = this.loaded.retrying;
  protected readonly loadErrorText = LOAD_TEXT;
  protected readonly leaveNote = LEAVE_NOTE;

  protected readonly steps = computed(() =>
    registrationSteps(this.step, this.loaded.data()?.documents.length ?? 0),
  );

  protected constructor(protected readonly step: OnboardingStep) {
    // Leaving the screen: no late answer may load or change anything any more.
    inject(DestroyRef).onDestroy(() => {
      this.loaded.dispose();
    });
  }

  protected reload(): void {
    void this.load();
  }

  /** Reads the registration; a page that is not the step to do goes to the one that is. */
  protected async load(): Promise<void> {
    const request = this.loaded.begin();
    if (request === null) return;
    try {
      const state = await firstValueFrom(this.api.state());
      if (state.status === 'ACTIVE') {
        await this.leave(HOME_PATH);
      } else if (state.nextStep !== this.step) {
        await this.leave(STEP_PATHS[state.nextStep]);
      } else {
        this.loaded.succeed(request, state);
      }
    } catch {
      this.loaded.fail(request, LOAD_TEXT);
    }
  }

  protected async go(next: OnboardingStep): Promise<void> {
    await this.router.navigateByUrl(STEP_PATHS[next]);
  }

  /**
   * What every step answers alike: a closed registration (a notice, then home) and a step sent
   * out of order (asks where it goes). A 401 is the session interceptor's. True when it handled it.
   */
  protected handled(failure: CallFailure): boolean {
    if (failure.status === 401) return true;
    if (isAlreadyCompleted(failure)) {
      void this.completed();
      return true;
    }
    if (isOutOfOrder(failure)) {
      void this.load();
      return true;
    }
    return false;
  }

  private async leave(path: string): Promise<void> {
    this.loaded.dispose();
    await this.router.navigateByUrl(path, { replaceUrl: true });
  }

  private async completed(): Promise<void> {
    await firstValueFrom(
      openPaymentNoticeDialog(this.dialog, {
        title: COMPLETE_TITLE,
        message: COMPLETE_MESSAGES[this.step],
        actions: [{ label: COMPLETE_BUTTON, value: 'account' }],
      }).afterClosed(),
      { defaultValue: undefined },
    );
    await this.leave(HOME_PATH);
  }
}
