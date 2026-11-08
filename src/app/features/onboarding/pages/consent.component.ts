import { Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { callFailure } from '@shared/forms/call-failure';
import { CheckFieldComponent } from '@shared/ui/check-field/check-field.component';
import { LoadErrorComponent } from '@shared/ui/load-error/load-error.component';
import { PageNoticeComponent } from '@shared/ui/page-notice/page-notice.component';
import { SkeletonBlockComponent } from '@shared/ui/skeleton/skeleton-block.component';
import { SkeletonContentDirective } from '@shared/ui/skeleton/skeleton-content.directive';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { ToastService } from '@shared/ui/toast/toast.service';
import { OnboardingFrameComponent } from '../components/onboarding-frame.component';
import {
  COMPLETED_TEXT,
  CONSENT_CHANGED_TEXT,
  CONSENT_CHANGED_TITLE,
  CONSENT_CHECK,
  CONSENT_HEADING,
  CONSENT_HELP,
  CONSENT_NEEDS_CHECK,
  consentEnding,
  consentParagraphs,
  consentProblem,
} from '../model/onboarding';
import { OnboardingPage } from './onboarding-page';
import { ONBOARDING_STYLES } from './onboarding.styles';

const TEXT_ID = 'consent-title';

const CONSENT_STYLES = `
  .heading {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.25rem 1rem;
  }
  .heading h2 {
    margin: 0;
  }
  .text {
    box-sizing: border-box;
    max-height: 28.75rem;
    overflow-y: auto;
    padding: 1.25rem 1.375rem 0.375rem;
    border: 1px solid var(--quipu-piedra-oscura);
    border-radius: var(--quipu-radio);
    background: var(--quipu-alpaca);
  }
  .text p {
    margin: 0 0 0.875rem;
    font: var(--mat-sys-body-large);
    line-height: 1.6;
  }
`;

/**
 * O3 «Tu consentimiento» (CU-11, RN-14) on the canvas «OnbConsentimiento»: the text in force, the box
 * and «Terminar registro», which waits for the box. Accepting closes the registration: the guest is
 * Active and goes home (H1 or T1) with «Tu registro está completo.». If the text changed while it was
 * read, it is read again and the box is cleared (the BFF answers 400 on `consentVersion`).
 */
@Component({
  selector: 'app-onboarding-consent',
  imports: [
    CheckFieldComponent,
    LoadErrorComponent,
    OnboardingFrameComponent,
    PageNoticeComponent,
    SkeletonBlockComponent,
    SkeletonComponent,
    SkeletonContentDirective,
  ],
  templateUrl: './consent.component.html',
  styles: [ONBOARDING_STYLES, CONSENT_STYLES],
})
export class OnboardingConsentComponent extends OnboardingPage {
  private readonly toasts = inject(ToastService);

  protected readonly textId = TEXT_ID;
  protected readonly heading = CONSENT_HEADING;
  protected readonly checkLabel = CONSENT_CHECK;
  protected readonly checkHelp = CONSENT_HELP;
  protected readonly needsCheck = CONSENT_NEEDS_CHECK;
  protected readonly changedTitle = CONSENT_CHANGED_TITLE;
  protected readonly changedText = CONSENT_CHANGED_TEXT;

  /** The version of the text the guest had in front when it marked the box; null if it is not marked. */
  private readonly acceptedVersion = signal<string | null>(null);
  protected readonly checkError = signal<string | null>(null);
  protected readonly changed = signal(false);
  protected readonly problem = signal<string | null>(null);
  protected readonly sending = signal(false);

  protected readonly version = computed(() => this.loaded.data()?.consent.version ?? '');
  /** Marked for the text on screen: a new text clears it, however the box was marked meanwhile. */
  protected readonly accepted = computed(
    () => this.version() !== '' && this.acceptedVersion() === this.version(),
  );
  protected readonly paragraphs = computed(() =>
    consentParagraphs(this.loaded.data()?.consent.text ?? ''),
  );
  protected readonly ending = computed(() =>
    consentEnding(this.auth.session()?.guestType === 'TEMPORARY'),
  );

  /** The read starts with the page, not in a hook (Sonar S7059). */
  protected readonly started = this.load();

  constructor() {
    super('CONSENT');
  }

  protected check(accepted: boolean): void {
    this.acceptedVersion.set(accepted ? this.version() : null);
    if (accepted) {
      this.checkError.set(null);
      this.changed.set(false);
    }
  }

  protected async finish(): Promise<void> {
    const consent = this.loaded.data()?.consent;
    if (consent === undefined || !this.accepted() || this.sending()) return;
    this.problem.set(null);
    this.sending.set(true);
    try {
      await firstValueFrom(this.api.acceptConsent(consent.version));
      this.toasts.show(COMPLETED_TEXT, { tone: 'success' });
      await this.finishRegistration();
    } catch (error: unknown) {
      await this.failed(error);
    } finally {
      this.sending.set(false);
    }
  }

  private async failed(error: unknown): Promise<void> {
    const failure = callFailure(error);
    if (this.handled(failure)) return;
    const found = consentProblem(failure);
    if (found.place === 'check') {
      this.checkError.set(found.message);
    } else if (found.place === 'changed') {
      // The text changed: it is read again and the box clears itself, so the guest accepts what it read.
      this.acceptedVersion.set(null);
      this.changed.set(true);
      await this.load();
    } else {
      this.problem.set(found.message);
    }
  }
}
