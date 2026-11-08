import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  OnInit,
  signal,
} from '@angular/core';
import { FieldTree, form, FormRoot } from '@angular/forms/signals';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, firstValueFrom, map, Observable, of } from 'rxjs';
import type { components } from '@core/api/bff.generated';
import { callFailure } from '@shared/forms/call-failure';
import { AsyncContentState } from '@shared/data/async-content';
import { focusFirstProblem, focusWhenInvalid } from '@shared/forms/form-feedback';
import { PersonalDataFieldsComponent } from '@shared/forms/personal-data-fields.component';
import { personalDataRules, toPersonalData } from '@shared/forms/personal-data';
import type { PersonalData } from '@shared/forms/personal-data';
import { INVALID_FILE_TEXT, isValidVoucher } from '@shared/payments/proof-rules';
import { CHANGE_PASSWORD_ACTION } from '@shared/ui/account-actions/change-password-action';
import { FactTileComponent } from '@shared/ui/fact-tile/fact-tile.component';
import { LoadErrorComponent } from '@shared/ui/load-error/load-error.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { SkeletonBlockComponent } from '@shared/ui/skeleton/skeleton-block.component';
import { SkeletonCardsComponent } from '@shared/ui/skeleton/skeleton-cards.component';
import { SkeletonFieldsComponent } from '@shared/ui/skeleton/skeleton-fields.component';
import { SkeletonContentDirective } from '@shared/ui/skeleton/skeleton-content.directive';
import { SkeletonFactsComponent } from '@shared/ui/skeleton/skeleton-facts.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { ToastService } from '@shared/ui/toast/toast.service';
import { OwnDocumentsComponent } from '../components/own-documents.component';
import { GuestProfileService } from '../data/guest-profile.service';
import { OwnContractService } from '../data/own-contract.service';
import type { OwnProfile, OwnProfileClient } from '../data/own-profile';
import { TemporaryGuestPaymentsService } from '../data/temporary-guest-payments.service';
import { TemporaryGuestProfileService } from '../data/temporary-guest-profile.service';
import {
  CANNOT_CLEAR_TEXT,
  CHANGE_PASSWORD_LABEL,
  clearsSaved,
  contractDeal,
  DEAL_NOTE,
  DOCUMENT_UPLOADED_TEXT,
  isDirty,
  LOAD_PROFILE_TEXT,
  openProblem,
  PROFILE_TITLE,
  SAVED_TEXT,
  saveProblem,
  stayDeal,
  toDocumentRows,
  toProfileUpdate,
  uploadProblem,
} from '../model/own-profile';
import type { DealView, OwnDocumentRow, StayDeal } from '../model/own-profile';
import { OWN_PROFILE_STYLES } from './own-profile.styles';

type Contract = components['schemas']['Contract'];
/** A server error placed under its field, as the submit action of Signal Forms answers it. */
type FieldErrors = { fieldTree: FieldTree<string>; kind: 'server'; message: string }[];

interface ProfileData {
  readonly profile: OwnProfile;
  readonly contract: Contract | null;
  readonly stay: StayDeal | null;
}

const ERROR_ID = 'own-profile-error';

/**
 * H5 (guest with a contract) and T3 (temporary guest) «Mis datos» (CU-20, CU-23, RN-17) on the
 * canvas «MisDatos»: the contact data and the emergency contact, which only the guest changes; what
 * the administration keeps, read only; and the own documents, which can be added but not deleted
 * (RN-37). The two audiences differ only in the path of the BFF and in what the administration
 * keeps, so the route says which one it is.
 */
@Component({
  selector: 'app-own-profile',
  imports: [
    FactTileComponent,
    FormRoot,
    LoadErrorComponent,
    OwnDocumentsComponent,
    PageHeaderComponent,
    PersonalDataFieldsComponent,
    RouterLink,
    SkeletonBlockComponent,
    SkeletonCardsComponent,
    SkeletonComponent,
    SkeletonContentDirective,
    SkeletonFactsComponent,
    SkeletonFieldsComponent,
  ],
  templateUrl: './own-profile.component.html',
  styles: OWN_PROFILE_STYLES,
})
export class OwnProfileComponent implements OnInit {
  private readonly audience =
    inject(ActivatedRoute).snapshot.data['audience'] === 'TEMPORARY' ? 'TEMPORARY' : 'CONTRACT';
  private readonly api: OwnProfileClient =
    this.audience === 'TEMPORARY'
      ? inject(TemporaryGuestProfileService)
      : inject(GuestProfileService);
  private readonly contracts = inject(OwnContractService);
  private readonly stays = inject(TemporaryGuestPaymentsService);
  private readonly toasts = inject(ToastService);
  private readonly changePasswordAction = inject(CHANGE_PASSWORD_ACTION, { optional: true });
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly title = PROFILE_TITLE;
  protected readonly loadErrorText = LOAD_PROFILE_TEXT;
  protected readonly dealNote = DEAL_NOTE;
  /** A value longer than this goes one step smaller, so it never overflows its tile. */
  protected readonly longValue = 18;
  protected readonly changePasswordLabel = CHANGE_PASSWORD_LABEL;
  protected readonly errorId = ERROR_ID;
  protected readonly generalError = signal<string | null>(null);

  private readonly loaded = new AsyncContentState<ProfileData>();
  protected readonly view = this.loaded.state;
  protected readonly retrying = this.loaded.retrying;
  protected readonly refreshError = this.loaded.refreshError;
  protected readonly refreshing = this.loaded.refreshing;

  private readonly saved = computed<PersonalData | null>(() => {
    const data = this.loaded.data();
    return data === null ? null : toPersonalData(data.profile);
  });
  private readonly model = signal<PersonalData>(
    toPersonalData({
      name: '',
      phone: null,
      contactEmail: null,
      emergencyContact: null,
    }),
  );

  protected readonly profileForm = form(
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

  protected readonly dirty = computed(() => {
    const saved = this.saved();
    return saved !== null && isDirty(this.model(), saved);
  });
  protected readonly saving = computed(() => this.profileForm().submitting());

  protected readonly deal = computed<DealView | null>(() => {
    const data = this.loaded.data();
    if (data === null) return null;
    return this.audience === 'TEMPORARY'
      ? stayDeal(data.profile, data.stay)
      : contractDeal(data.profile, data.contract);
  });
  protected readonly documents = computed<OwnDocumentRow[]>(() =>
    toDocumentRows(this.loaded.data()?.profile.documents ?? [], new Date()),
  );
  protected readonly limit = computed(() => this.loaded.data()?.profile.documentsLimit ?? 5);

  // The document waiting to be sent.
  protected readonly chosen = signal<File | null>(null);
  protected readonly fileError = signal<string | null>(null);
  protected readonly uploading = signal(false);

  constructor() {
    // Leaving the screen: no late answer may load or change anything any more.
    inject(DestroyRef).onDestroy(() => {
      this.loaded.dispose();
    });
  }

  ngOnInit(): void {
    void this.load(true);
  }

  protected reload(): void {
    void this.load(true);
  }

  protected reset(): void {
    const saved = this.saved();
    if (saved !== null) this.model.set(saved);
    this.generalError.set(null);
  }

  /** A0.6 opens over this page; the shell tells a changed password. */
  protected changePassword(event: Event): void {
    const opener = event.currentTarget instanceof HTMLElement ? event.currentTarget : undefined;
    void this.changePasswordAction?.(opener);
  }

  protected pick(file: File | null): void {
    this.chosen.set(file);
    this.fileError.set(file !== null && !isValidVoucher(file) ? INVALID_FILE_TEXT : null);
  }

  protected async upload(): Promise<void> {
    const file = this.chosen();
    if (file === null || this.fileError() !== null || this.uploading()) return;
    this.uploading.set(true);
    try {
      await firstValueFrom(this.api.upload(file));
      this.chosen.set(null);
      this.toasts.show(DOCUMENT_UPLOADED_TEXT, { tone: 'success' });
      await this.load(false);
    } catch (error: unknown) {
      this.uploadFailed(error);
    } finally {
      this.uploading.set(false);
    }
  }

  /** «Ver documento»: asks for a fresh signed link and opens it in another tab (TAR-241). */
  protected async viewDocument(row: OwnDocumentRow): Promise<void> {
    try {
      const document = await firstValueFrom(this.api.document(row.id));
      this.window?.open(document.url, '_blank', 'noopener,noreferrer');
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse && error.status === 401) return;
      const problem = openProblem(callFailure(error));
      this.toasts.show(problem.message);
      if (problem.reload) await this.load(false);
    }
  }

  private uploadFailed(error: unknown): void {
    // A 401 is the session interceptor's: it already goes to the login.
    if (error instanceof HttpErrorResponse && error.status === 401) return;
    const problem = uploadProblem(callFailure(error), this.limit());
    if (problem.place === 'file') this.fileError.set(problem.message);
    else this.toasts.show(problem.message);
  }

  /** Runs when the form is valid; a failure comes back as errors, so the form stays editable. */
  private async save(): Promise<FieldErrors | undefined> {
    this.generalError.set(null);
    const saved = this.saved();
    if (saved === null) return undefined;
    if (clearsSaved(this.model(), saved)) {
      this.generalError.set(CANNOT_CLEAR_TEXT);
      focusFirstProblem(this.host, this.injector, ERROR_ID);
      return undefined;
    }
    const changes = toProfileUpdate(this.model(), saved);
    if (changes === null) return undefined;
    try {
      await firstValueFrom(this.api.update(changes));
    } catch (error: unknown) {
      return this.saveFailed(error);
    }
    this.toasts.show(SAVED_TEXT, { tone: 'success' });
    await this.load(true);
    return undefined;
  }

  private saveFailed(error: unknown): FieldErrors | undefined {
    if (error instanceof HttpErrorResponse && error.status === 401) return undefined;
    const problem = saveProblem(callFailure(error));
    focusFirstProblem(this.host, this.injector, ERROR_ID);
    if (problem.place === 'general') {
      this.generalError.set(problem.message);
      return undefined;
    }
    return [
      { fieldTree: this.profileForm[problem.field], kind: 'server', message: problem.message },
    ];
  }

  /** `resetForm` fills the form with what is saved; an upload keeps what the guest is typing. */
  private async load(resetForm: boolean): Promise<void> {
    const request = this.loaded.begin();
    if (request === null) return;
    try {
      const [profile, contract, stay] = await Promise.all([
        firstValueFrom(this.api.profile()),
        firstValueFrom(this.contractOf()),
        firstValueFrom(this.stayOf()),
      ]);
      if (this.loaded.succeed(request, { profile, contract, stay }) && resetForm) {
        this.model.set(toPersonalData(profile));
      }
    } catch {
      this.loaded.fail(request, LOAD_PROFILE_TEXT);
    }
  }

  // What the administration keeps is a help, not the point of the page: without it the data and
  // the documents still show, so a failure here does not fail the page.
  private contractOf(): Observable<Contract | null> {
    if (this.audience === 'TEMPORARY') return of(null);
    return this.contracts.get().pipe(
      map((contracts) => contracts.current),
      catchError(() => of(null)),
    );
  }

  private stayOf(): Observable<StayDeal | null> {
    if (this.audience !== 'TEMPORARY') return of(null);
    return this.stays.paymentStatus().pipe(
      map(({ startDate, endDate, agreedAmount, environmentCode, environmentType }) => ({
        startDate,
        endDate,
        agreedAmount,
        // An old stay without environment brings both null (TAR-304): no «Ambiente» tile.
        ...(environmentCode !== null && environmentType !== null
          ? { environment: { type: environmentType, code: environmentCode } }
          : {}),
      })),
      catchError(() => of(null)),
    );
  }
}
