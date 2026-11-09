import { LatestRequest } from '@shared/data/latest-request';
import { RefreshErrorComponent } from '@shared/ui/refresh-error/refresh-error.component';
import { FormSummaryLayoutComponent } from '@shared/forms/form-summary-layout.component';
import { GuestFormHeaderComponent } from '../components/guest-form-header.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { SkeletonContentDirective } from '@shared/ui/skeleton/skeleton-content.directive';
import { SkeletonFieldsComponent } from '@shared/ui/skeleton/skeleton-fields.component';
import { SkeletonFactsComponent } from '@shared/ui/skeleton/skeleton-facts.component';
import { SkeletonBlockComponent } from '@shared/ui/skeleton/skeleton-block.component';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  AdminGuestsService,
  DocumentType,
  GuestUpdate,
  PendingGuestDetail,
} from '@core/api/clients/admin-guests.service';
import { toBffErrorWithServerMessage } from '@core/http/bff-error';
import { isConcurrentModification, withVersion } from '@core/http/concurrent-modification';
import { openConcurrentModificationDialog } from '@shared/concurrent-modification/concurrent-modification-dialog.component';
import { focusFirstProblem } from '@shared/forms/form-feedback';
import { GUEST_PAGE_STYLES } from './guest-page.styles';
import {
  describedBy,
  DOCUMENT_TYPE_CHIPS,
  DOCUMENT_UPDATED_TEXT,
  documentNumberError,
  documentText,
  GUEST_STATUS_BADGES,
  guestName,
  todayText,
} from '../model/guest-texts';
import { DOCUMENT_LOCKED_TEXT, documentProblem, goneText } from '../model/stay-document-failures';
import { callFailure } from '@shared/forms/call-failure';
import { GUEST_FORM_STYLES } from './guest-form.styles';
import { ToastService } from '@shared/ui/toast/toast.service';

type LoadState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready' }
  | { readonly kind: 'locked' }
  | { readonly kind: 'not-found' }
  | { readonly kind: 'error'; readonly message: string };

const GENERAL_ERROR_ID = 'document-form-error';

const DOCUMENT_TYPES = (Object.keys(DOCUMENT_TYPE_CHIPS) as DocumentType[]).map((value) => ({
  value,
  label: DOCUMENT_TYPE_CHIPS[value],
}));

/**
 * A3.5 (RN-36) on the approved canvas: corrects the document of a guest pending activation, with
 * the `version` it was loaded with (BE-SPR-DAT-13). Only the fields that changed travel.
 */
@Component({
  selector: 'app-document-form',
  imports: [
    RefreshErrorComponent,
    FormSummaryLayoutComponent,
    GuestFormHeaderComponent,
    SkeletonBlockComponent,
    SkeletonFactsComponent,
    SkeletonFieldsComponent,
    SkeletonContentDirective,
    SkeletonComponent,
    RouterLink,
  ],
  templateUrl: './document-form.component.html',
  styles: [GUEST_PAGE_STYLES, GUEST_FORM_STYLES],
})
export class DocumentFormComponent {
  private readonly guests = inject(AdminGuestsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly toasts = inject(ToastService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly generalErrorId = GENERAL_ERROR_ID;
  protected readonly documentTypes = DOCUMENT_TYPES;
  protected readonly lockedText = DOCUMENT_LOCKED_TEXT;
  protected readonly today = todayText();
  protected readonly describedBy = describedBy;
  protected guestId = '';

  protected readonly retrying = signal(false);
  protected readonly refreshing = signal(false);
  protected readonly refreshError = signal<string | null>(null);
  protected readonly state = signal<LoadState>({ kind: 'loading' });
  protected readonly loaded = signal<PendingGuestDetail | null>(null);
  /** The name the back link uses, kept when the guest turns out to be no longer pending. */
  protected readonly who = signal<string | null>(null);
  protected readonly documentType = signal<DocumentType>('DNI');
  protected readonly documentNumber = signal('');
  protected readonly submitted = signal(false);
  protected readonly busy = signal(false);
  protected readonly generalError = signal<string | null>(null);
  protected readonly serverError = signal<string | null>(null);

  protected readonly backLabel = computed(() => {
    const who = this.who();
    return who ? `Volver a ${who}` : 'Volver al huésped';
  });
  protected readonly loadError = computed(() => {
    const state = this.state();
    return state.kind === 'error' ? state.message : '';
  });
  protected readonly currentDocument = computed(() => {
    const loaded = this.loaded();
    return loaded ? documentText(loaded) : '';
  });
  protected readonly statusBadge = GUEST_STATUS_BADGES.PENDING_ACTIVATION;
  protected readonly changes = computed<Omit<GuestUpdate, 'version'>>(() => {
    const loaded = this.loaded();
    if (!loaded) return {};
    const type = this.documentType();
    const number = this.documentNumber().trim();
    return {
      ...(type === loaded.documentType ? {} : { documentType: type }),
      ...(number === loaded.documentNumber ? {} : { documentNumber: number }),
    };
  });
  protected readonly canSave = computed(
    () =>
      this.state().kind === 'ready' &&
      !this.busy() &&
      !this.refreshing() &&
      this.refreshError() === null &&
      Object.keys(this.changes()).length > 0,
  );
  protected readonly saveLabel = computed(() =>
    this.busy() ? 'Guardando…' : 'Corregir documento',
  );
  protected readonly numberError = computed(() => {
    const server = this.serverError();
    if (server) return server;
    return this.submitted()
      ? documentNumberError(this.documentType(), this.documentNumber())
      : null;
  });

  private readonly destroyRef = inject(DestroyRef);
  private readonly request = new LatestRequest();

  /** The reads start with the page, from a field: not in `ngOnInit` (FE-ANG-CMP-10) nor in the constructor. */
  protected readonly started = this.start();

  private start(): true {
    this.guestId = this.route.snapshot.paramMap.get('id') ?? '';
    void this.load();
    return true;
  }

  protected chooseType(type: DocumentType): void {
    this.documentType.set(type);
    this.serverError.set(null);
  }

  protected typedNumber(target: EventTarget | null): void {
    this.documentNumber.set(target instanceof HTMLInputElement ? target.value : '');
    this.serverError.set(null);
  }

  protected retry(): void {
    if (this.retrying() || this.refreshing() || this.state().kind === 'loading') return;
    void this.load();
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    const loaded = this.loaded();
    if (!loaded || !this.canSave()) return;
    this.submitted.set(true);
    this.generalError.set(null);
    this.serverError.set(null);
    if (this.numberError()) {
      focusFirstProblem(this.host, this.injector, GENERAL_ERROR_ID);
      return;
    }
    this.busy.set(true);
    try {
      await firstValueFrom(
        this.guests.updateGuest(this.guestId, withVersion(loaded, this.changes())),
      );
    } catch (error: unknown) {
      if (!this.destroyRef.destroyed) await this.failed(error);
      return;
    } finally {
      if (!this.destroyRef.destroyed) this.busy.set(false);
    }
    if (this.destroyRef.destroyed) return;
    this.toasts.show(DOCUMENT_UPDATED_TEXT);
    await this.backToGuest();
  }

  private async failed(error: unknown): Promise<void> {
    if (isConcurrentModification(error)) {
      return this.concurrent();
    }
    if (error instanceof HttpErrorResponse && error.status === 404) {
      this.toasts.show(goneText(callFailure(error)));
      return this.backToGuest();
    }
    // GUEST_DOCUMENT_LOCKED, GUEST_DOCUMENT_TAKEN and VALIDATION_ERROR go under the document.
    const problem = documentProblem(callFailure(error));
    if (problem.place === 'document') this.serverError.set(problem.message);
    else this.generalError.set(problem.message);
    focusFirstProblem(this.host, this.injector, GENERAL_ERROR_ID);
  }

  /** The canvas words it "El registro cambió", with "Cerrar" and "Volver a cargar". */
  private async concurrent(): Promise<void> {
    const ref = openConcurrentModificationDialog(this.dialog, { backLabel: 'Cerrar' });
    const choice = await firstValueFrom(ref.afterClosed());
    if (!this.destroyRef.destroyed && choice === 'reload') {
      await this.load();
    }
  }

  private async backToGuest(): Promise<void> {
    await this.router.navigate(['/admin/guests', this.guestId]);
  }

  /** Loads the guest with its current `version` and starts the form from its document. */
  private async load(): Promise<void> {
    const request = this.request.begin();
    const refreshing = this.state().kind === 'ready';
    this.refreshing.set(refreshing);
    const isRetry = this.state().kind === 'error';
    this.retrying.set(isRetry);
    if (!isRetry && !refreshing) this.state.set({ kind: 'loading' });
    this.submitted.set(false);
    this.serverError.set(null);
    this.generalError.set(null);
    try {
      const guest = await firstValueFrom(this.guests.get(this.guestId));
      if (!this.request.isCurrent(request)) return;
      this.refreshError.set(null);
      this.who.set(guestName(guest));
      if (guest.status !== 'PENDING_ACTIVATION') {
        this.loaded.set(null);
        this.state.set({ kind: 'locked' });
        return;
      }
      this.loaded.set(guest);
      this.documentType.set(guest.documentType);
      this.documentNumber.set(guest.documentNumber);
      this.state.set({ kind: 'ready' });
    } catch (error: unknown) {
      if (this.request.isCurrent(request)) this.failLoad(error, refreshing);
    } finally {
      if (this.request.isCurrent(request)) this.endLoad();
    }
  }

  /** A failed refresh keeps the form and says so; any other failure replaces it. */
  private failLoad(error: unknown, refreshing: boolean): void {
    const { message } = toBffErrorWithServerMessage(error);
    const notFound = error instanceof HttpErrorResponse && error.status === 404;
    if (refreshing && !notFound) this.refreshError.set(message);
    else this.state.set(notFound ? { kind: 'not-found' } : { kind: 'error', message });
  }

  private endLoad(): void {
    this.retrying.set(false);
    this.refreshing.set(false);
  }
}
