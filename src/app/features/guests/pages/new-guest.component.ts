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
import { FieldTree, form, FormField, FormRoot, validate } from '@angular/forms/signals';
import { MatDialog } from '@angular/material/dialog';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AdminGuestsService } from '@core/api/clients/admin-guests.service';
import type {
  DocumentType,
  GuestAlreadyRegistered,
  GuestCreated,
  GuestInput,
} from '@core/api/clients/admin-guests.service';
import { contactEmailError, phoneError } from '@shared/forms/contact-rules';
import { firstError, focusFirstProblem, focusWhenInvalid } from '@shared/forms/form-feedback';
import { FieldControlDirective } from '@shared/ui/form-field/field-control.directive';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';
import { FactTileComponent } from '@shared/ui/fact-tile/fact-tile.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/ui/status-badge/status-badge.component';
import { openAlreadyRegisteredDialog } from '../components/already-registered-dialog.component';
import { openInactiveGuestDialog } from '../components/inactive-guest-dialog.component';
import type { InactiveGuestResult } from '../components/inactive-guest-dialog.component';
import { openPendingDebtDialog } from '../components/pending-debt-dialog.component';
import { AccessHandoffService } from '../data/access-handoff.service';
import { SUMMARY_LAYOUT_STYLES } from './summary-layout.styles';
import { documentNumberError, documentText } from '../model/guest-texts';
import {
  ACCESS_MODE_HELP,
  ACCESS_MODE_OPTIONS,
  callFailure,
  createProblem,
  DOCUMENT_HELP,
  DOCUMENT_TYPE_OPTIONS,
  EMAIL_HELP,
  EMPTY_NEW_GUEST,
  GUEST_TYPE_HELP,
  GUEST_TYPE_OPTIONS,
  inactiveGuestId,
  newGuestFacts,
  PHONE_HELP,
  REACTIVATED_TEXT,
  toGuestInput,
} from '../model/new-guest';
import type { AccessMode, GuestType, NewGuestField, NewGuestModel } from '../model/new-guest';
import { ToastService } from '@shared/ui/toast/toast.service';

const GENERAL_ERROR_ID = 'new-guest-error';

/** What A3.1 adds to the shared layout: the fieldsets, the short fields and «(opcional)». */
const NEW_GUEST_STYLES = `
  .narrow .quipu-input {
    max-width: var(--quipu-campo-corto);
  }
  .figures {
    font-variant-numeric: tabular-nums;
  }
  .optional {
    font-weight: normal;
    color: var(--quipu-tinta-secundaria);
  }
  .note app-status-badge {
    vertical-align: middle;
  }
`;

/** A server error placed under its field, as the submit action of Signal Forms answers it. */
type FieldErrors = { fieldTree: FieldTree<string>; kind: 'server'; message: string }[];

/**
 * A3.1 «Nuevo huésped» (RF-02, CU-02, CU-09, CU-28) on the canvas «HuespedNuevo»: only what the
 * administrator knows (RN-31), the summary of what will be created, and the first access. A new
 * guest goes to A3.7 with its access in memory (FE-ANG-SEC-02); a document already registered or
 * inactive opens its dialog, and the inactive one can be reactivated from there.
 */
@Component({
  selector: 'app-new-guest',
  imports: [
    FieldControlDirective,
    FormFieldComponent,
    FactTileComponent,
    FormField,
    FormRoot,
    PageHeaderComponent,
    RouterLink,
    StatusBadgeComponent,
  ],
  templateUrl: './new-guest.component.html',
  styles: [SUMMARY_LAYOUT_STYLES, NEW_GUEST_STYLES],
})
export class NewGuestComponent {
  private readonly guests = inject(AdminGuestsService);
  private readonly handoff = inject(AccessHandoffService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly toasts = inject(ToastService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  /** Set when the page goes away: a late answer then neither navigates nor opens a dialog. */
  private destroyed = false;

  protected readonly guestTypes = GUEST_TYPE_OPTIONS;
  protected readonly documentTypes = DOCUMENT_TYPE_OPTIONS;
  protected readonly accessModes = ACCESS_MODE_OPTIONS;
  protected readonly phoneHelp = PHONE_HELP;
  protected readonly emailHelp = EMAIL_HELP;
  protected readonly generalErrorId = GENERAL_ERROR_ID;
  protected readonly generalError = signal<string | null>(null);

  private readonly model = signal<NewGuestModel>({ ...EMPTY_NEW_GUEST });

  protected readonly guestForm = form(
    this.model,
    (path) => {
      validate(path.documentNumber, (field) => {
        const message = documentNumberError(field.valueOf(path.documentType), field.value());
        return message === null ? undefined : { kind: 'documentNumber', message };
      });
      validate(path.phone, (field) => {
        const message = phoneError(field.value());
        return message === null ? undefined : { kind: 'phone', message };
      });
      validate(path.contactEmail, (field) => {
        const message = contactEmailError(field.value());
        return message === null ? undefined : { kind: 'contactEmail', message };
      });
    },
    {
      submission: {
        action: () => this.create(),
        onInvalid: focusWhenInvalid(this.host, this.injector, GENERAL_ERROR_ID),
      },
    },
  );

  protected readonly type = computed(() => this.model().type);
  protected readonly documentType = computed(() => this.model().documentType);
  protected readonly accessMode = computed(() => this.model().accessMode);
  protected readonly typeHelp = computed(() => GUEST_TYPE_HELP[this.type()]);
  protected readonly documentHelp = computed(() => DOCUMENT_HELP[this.documentType()]);
  protected readonly accessHelp = computed(() => ACCESS_MODE_HELP[this.accessMode()]);
  protected readonly facts = computed(() => newGuestFacts(this.model()));
  protected readonly numberError = computed(() => firstError(this.guestForm.documentNumber));
  protected readonly phoneError = computed(() => firstError(this.guestForm.phone));
  protected readonly emailError = computed(() => firstError(this.guestForm.contactEmail));
  protected readonly saving = computed(() => this.guestForm().submitting());

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
    });
  }

  protected chooseType(type: GuestType): void {
    this.model.update((model) => ({ ...model, type }));
  }

  protected chooseDocumentType(documentType: DocumentType): void {
    this.model.update((model) => ({ ...model, documentType }));
  }

  protected chooseAccessMode(accessMode: AccessMode): void {
    this.model.update((model) => ({ ...model, accessMode }));
  }

  /** Runs when the form is valid; a failure comes back as errors, so the form stays editable. */
  private async create(): Promise<FieldErrors | undefined> {
    this.generalError.set(null);
    const input = toGuestInput(this.model());
    let answer: GuestCreated | GuestAlreadyRegistered;
    try {
      answer = await firstValueFrom(this.guests.create(input));
    } catch (error: unknown) {
      return this.destroyed ? undefined : this.failed(error, input);
    }
    if (this.destroyed) return undefined;
    if (answer.alreadyRegistered) {
      this.alreadyRegistered(answer);
    } else {
      await this.created(answer, input);
    }
    return undefined;
  }

  /** The access goes to A3.7 in memory only; the address carries just the guest id. */
  private async created({ guest, access }: GuestCreated, input: GuestInput): Promise<void> {
    this.handoff.put({
      guestId: guest.id,
      documentType: guest.documentType,
      documentNumber: guest.documentNumber,
      type: guest.type,
      phone: input.phone ?? null,
      contactEmail: input.contactEmail ?? null,
      access,
      regenerated: false,
    });
    await this.router.navigate(['/admin/guests', guest.id, 'access']);
  }

  private alreadyRegistered({ guest }: GuestAlreadyRegistered): void {
    openAlreadyRegisteredDialog(this.dialog, guest)
      .afterClosed()
      .subscribe((open) => {
        if (open === true) void this.router.navigate(['/admin/guests', guest.id]);
      });
  }

  private failed(error: unknown, input: GuestInput): FieldErrors | undefined {
    if (error instanceof HttpErrorResponse && error.status === 401) {
      // The session interceptor already forgot the session and goes to the login.
      return undefined;
    }
    const failure = callFailure(error);
    const inactiveId = inactiveGuestId(failure);
    if (inactiveId !== null) {
      this.inactive(inactiveId, documentText({ ...input, name: null }));
      return undefined;
    }
    const problem = createProblem(failure);
    focusFirstProblem(this.host, this.injector, GENERAL_ERROR_ID);
    if (problem.place === 'general') {
      this.generalError.set(problem.message);
      return undefined;
    }
    return [{ fieldTree: this.fieldOf(problem.field), kind: 'server', message: problem.message }];
  }

  private inactive(guestId: string, document: string): void {
    openInactiveGuestDialog(this.dialog, {
      document,
      reactivate: () => this.guests.reactivate(guestId),
    })
      .afterClosed()
      .subscribe((result) => {
        if (result) this.afterInactive(guestId, document, result);
      });
  }

  private afterInactive(guestId: string, document: string, result: InactiveGuestResult): void {
    if (result.kind === 'reactivated') {
      this.toasts.show(REACTIVATED_TEXT);
      void this.router.navigate(['/admin/guests', guestId]);
      return;
    }
    openPendingDebtDialog(this.dialog, { document, debt: result.debt })
      .afterClosed()
      .subscribe((pay) => {
        if (pay === true) {
          void this.router.navigate(['/admin/payments/new'], { queryParams: { guestId } });
        }
      });
  }

  // The explicit type breaks the circular inference between the form and its submit action.
  private fieldOf(field: NewGuestField): FieldTree<string> {
    const fields: Record<NewGuestField, FieldTree<string>> = {
      documentNumber: this.guestForm.documentNumber,
      phone: this.guestForm.phone,
      contactEmail: this.guestForm.contactEmail,
    };
    return fields[field];
  }
}
