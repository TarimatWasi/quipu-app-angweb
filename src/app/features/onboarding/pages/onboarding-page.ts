import { computed, DestroyRef, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { firstValueFrom, NEVER, of, switchMap } from 'rxjs';
import type { Observable } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { ResourceContent } from '@shared/data/resource-content';
import type { CallFailure } from '@shared/forms/call-failure';
import { openPaymentNoticeDialog } from '@shared/payments/payment-notice-dialog.component';
import { OnboardingService } from '../data/onboarding.service';
import type { OnboardingInProgress, OnboardingState } from '../data/onboarding.service';
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
  protected readonly auth = inject(AuthService);

  /**
   * The registration, read with the page (FE-ANG-CMP-10). A page that is not the step to do goes to
   * the one that is and keeps loading until it leaves; a read of a page the guest already left is
   * cancelled with it, so it never takes the guest away from where it is now.
   */
  private readonly read = rxResource<OnboardingInProgress, undefined>({
    stream: () => this.api.state().pipe(switchMap((state) => this.arrive(state))),
  });
  protected readonly loaded = new ResourceContent(this.read, { message: () => LOAD_TEXT });
  protected readonly view = this.loaded.state;
  protected readonly retrying = this.loaded.retrying;
  protected readonly loadErrorText = LOAD_TEXT;
  protected readonly leaveNote = LEAVE_NOTE;

  protected readonly steps = computed(() =>
    registrationSteps(this.step, this.loaded.data()?.documents.length ?? 0),
  );

  protected constructor(protected readonly step: OnboardingStep) {}

  /** Reads the registration again, keeping what is on screen; a page that is not the step to do goes to the one that is. */
  protected reload(): void {
    this.loaded.reload();
  }

  /** What a page fills with the registration of its own step, each time it is read (O1 its form). */
  protected arrived?(state: OnboardingInProgress): void;

  private arrive(state: OnboardingState): Observable<OnboardingInProgress> {
    // The session follows what the BFF says, so the guard lets the guest into the step it names.
    this.auth.onboardingAdvanced(state.status === 'ACTIVE' ? null : state.nextStep);
    if (state.status === 'ACTIVE') return this.leave(HOME_PATH);
    if (state.nextStep !== this.step) return this.leave(STEP_PATHS[state.nextStep]);
    this.arrived?.(state);
    return of(state);
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
      this.reload();
      return true;
    }
    return false;
  }

  /** Goes to `path`; the page keeps loading until it is gone. */
  private leave(path: string): Observable<never> {
    void this.router.navigateByUrl(path, { replaceUrl: true });
    return NEVER;
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
    await this.finishRegistration();
  }
}
