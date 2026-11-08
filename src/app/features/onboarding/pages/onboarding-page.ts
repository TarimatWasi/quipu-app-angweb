import { computed, DestroyRef, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { AsyncContentState } from '@shared/data/async-content';
import { LatestRequest } from '@shared/data/latest-request';
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
  private readonly destroyRef = inject(DestroyRef);
  /** Which read still counts: none once the guest has left this page (it must not redirect it). */
  private readonly latest = new LatestRequest();
  protected readonly auth = inject(AuthService);

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
    this.destroyRef.onDestroy(() => {
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
    const read = this.latest.begin();
    try {
      const state = await firstValueFrom(this.api.state());
      // A late answer of a page the guest already left must not take it away from where it is now.
      if (!this.latest.isCurrent(read)) return;
      // The session follows what the BFF says, so the guard lets the guest into the step it names.
      this.auth.onboardingAdvanced(state.status === 'ACTIVE' ? null : state.nextStep);
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

  /** A step was done: the session moves on (with the name the guest saved, if any) and so does the page. */
  protected async go(next: OnboardingStep, name?: string): Promise<void> {
    // A page the guest already left (or another guest's session after a logout) is not touched.
    if (this.destroyRef.destroyed) return;
    this.auth.onboardingAdvanced(next, name);
    await this.router.navigateByUrl(STEP_PATHS[next]);
  }

  /** The registration is over: the guest is Active and goes home. */
  protected async finishRegistration(): Promise<void> {
    if (this.destroyRef.destroyed) return;
    this.auth.onboardingAdvanced(null);
    await this.router.navigateByUrl(HOME_PATH, { replaceUrl: true });
  }

  /** The guest already left this page: what was in flight must change nothing any more. */
  protected get gone(): boolean {
    return this.destroyRef.destroyed;
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
    if (this.destroyRef.destroyed) return;
    this.loaded.dispose();
    await this.finishRegistration();
  }
}
