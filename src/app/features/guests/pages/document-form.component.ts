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
import { MatAnchor, MatButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  AdminGuestsService,
  DocumentType,
  GuestUpdate,
  PendingGuestDetail,
} from '@core/services/admin-guests.service';
import { toBffErrorWithServerMessage } from '@core/services/bff-error';
import { isConcurrentModification, withVersion } from '@core/services/concurrent-modification';
import { openConcurrentModificationDialog } from '@shared/concurrent-modification/concurrent-modification-dialog.component';
import { focusFirstProblem } from '@shared/forms/form-feedback';
import { GUEST_PAGE_STYLES } from '../guest-page.styles';
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_UPDATED_TEXT,
  documentNumberError,
  SNACK_MS,
} from '../guest-texts';
import { GUEST_FORM_STYLES } from './guest-form.styles';

type LoadState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready' }
  | { readonly kind: 'locked' }
  | { readonly kind: 'not-found' }
  | { readonly kind: 'error'; readonly message: string };

type FieldKey = 'documentType' | 'documentNumber';

const GENERAL_ERROR_ID = 'document-form-error';

/** RN-36, as the catalog words GUEST_DOCUMENT_LOCKED. */
const LOCKED_TEXT = 'El documento solo se corrige antes de que el huésped active su acceso';

const DOCUMENT_TYPES = (Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[]).map((value) => ({
  value,
  label: DOCUMENT_TYPE_LABELS[value],
}));

function isDocumentType(value: string): value is DocumentType {
  return value in DOCUMENT_TYPE_LABELS;
}

/**
 * A3.5 (RN-36): corrects the document of a guest pending activation, with the `version` it was
 * loaded with (BE-SPR-DAT-13). Only the fields that changed travel. Ids are opaque.
 */
@Component({
  selector: 'app-document-form',
  imports: [MatAnchor, MatButton, RouterLink],
  templateUrl: './document-form.component.html',
  styles: [GUEST_PAGE_STYLES, GUEST_FORM_STYLES],
})
export class DocumentFormComponent implements OnInit {
  private readonly guests = inject(AdminGuestsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly generalErrorId = GENERAL_ERROR_ID;
  protected readonly documentTypes = DOCUMENT_TYPES;
  protected readonly lockedText = LOCKED_TEXT;
  protected guestId = '';

  protected readonly state = signal<LoadState>({ kind: 'loading' });
  protected readonly loaded = signal<PendingGuestDetail | null>(null);
  protected readonly documentType = signal<DocumentType>('DNI');
  protected readonly documentNumber = signal('');
  protected readonly submitted = signal(false);
  protected readonly busy = signal(false);
  protected readonly generalError = signal<string | null>(null);
  protected readonly serverErrors = signal<Readonly<Partial<Record<FieldKey, string>>>>({});

  protected readonly loadError = computed(() => {
    const state = this.state();
    return state.kind === 'error' ? state.message : '';
  });
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
    () => this.state().kind === 'ready' && !this.busy() && Object.keys(this.changes()).length > 0,
  );
  protected readonly typeError = computed(() => this.serverErrors().documentType ?? null);
  protected readonly numberError = computed(() => {
    const server = this.serverErrors().documentNumber;
    if (server) return server;
    return this.submitted()
      ? documentNumberError(this.documentType(), this.documentNumber())
      : null;
  });

  private request = 0;
  private destroyed = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
    });
  }

  ngOnInit(): void {
    this.guestId = this.route.snapshot.paramMap.get('id') ?? '';
    void this.load();
  }

  protected chooseType(target: EventTarget | null): void {
    const value = target instanceof HTMLSelectElement ? target.value : '';
    if (isDocumentType(value)) this.documentType.set(value);
    this.serverErrors.set({});
  }

  protected typedNumber(target: EventTarget | null): void {
    this.documentNumber.set(target instanceof HTMLInputElement ? target.value : '');
    this.serverErrors.set({});
  }

  protected retry(): void {
    void this.load();
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    const loaded = this.loaded();
    if (!loaded || !this.canSave()) return;
    this.submitted.set(true);
    this.generalError.set(null);
    this.serverErrors.set({});
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
      if (!this.destroyed) await this.failed(error);
      return;
    } finally {
      if (!this.destroyed) this.busy.set(false);
    }
    if (this.destroyed) return;
    this.snackBar.open(DOCUMENT_UPDATED_TEXT, 'Cerrar', { duration: SNACK_MS });
    await this.backToGuest();
  }

  private async failed(error: unknown): Promise<void> {
    if (isConcurrentModification(error)) {
      return this.concurrent();
    }
    const { message, field } = toBffErrorWithServerMessage(error);
    if (error instanceof HttpErrorResponse && error.status === 404) {
      this.snackBar.open(message, 'Cerrar', { duration: SNACK_MS });
      return this.backToGuest();
    }
    if (error instanceof HttpErrorResponse && (error.status === 400 || error.status === 409)) {
      // GUEST_DOCUMENT_* and VALIDATION_ERROR go under their field; the number when none is given.
      const key: FieldKey = field === 'documentType' ? 'documentType' : 'documentNumber';
      this.serverErrors.set({ [key]: message });
    } else {
      this.generalError.set(message);
    }
    focusFirstProblem(this.host, this.injector, GENERAL_ERROR_ID);
  }

  private async concurrent(): Promise<void> {
    const ref = openConcurrentModificationDialog(this.dialog, {
      title: 'El huésped cambió',
      backLabel: 'Volver al huésped',
    });
    const choice = await firstValueFrom(ref.afterClosed());
    if (this.destroyed) return;
    if (choice === 'reload') {
      await this.load();
    } else if (choice === 'back') {
      await this.backToGuest();
    }
  }

  private async backToGuest(): Promise<void> {
    await this.router.navigate(['/admin/guests', this.guestId]);
  }

  /** Loads the guest with its current `version` and starts the form from its document. */
  private async load(): Promise<void> {
    const request = ++this.request;
    this.state.set({ kind: 'loading' });
    this.submitted.set(false);
    this.serverErrors.set({});
    this.generalError.set(null);
    try {
      const guest = await firstValueFrom(this.guests.get(this.guestId));
      if (request !== this.request) return;
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
      if (request !== this.request) return;
      const notFound = error instanceof HttpErrorResponse && error.status === 404;
      this.state.set(
        notFound
          ? { kind: 'not-found' }
          : { kind: 'error', message: toBffErrorWithServerMessage(error).message },
      );
    }
  }
}
