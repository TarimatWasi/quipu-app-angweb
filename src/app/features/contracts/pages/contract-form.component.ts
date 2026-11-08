import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FieldTree, form, FormField, FormRoot, validate } from '@angular/forms/signals';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin, map, Observable } from 'rxjs';
import { bodyCodeOf, toBffError } from '@core/http/bff-error';
import { AsyncContentState } from '@shared/data/async-content';
import { firstError, focusFirstProblem, problem } from '@shared/forms/form-feedback';
import { openPaymentNoticeDialog } from '@shared/payments/payment-notice-dialog.component';
import { FactTileComponent } from '@shared/ui/fact-tile/fact-tile.component';
import { FileFieldComponent } from '@shared/ui/file-field/file-field.component';
import { FieldControlDirective } from '@shared/ui/form-field/field-control.directive';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';
import { LoadErrorComponent } from '@shared/ui/load-error/load-error.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { SkeletonBlockComponent } from '@shared/ui/skeleton/skeleton-block.component';
import { SkeletonContentDirective } from '@shared/ui/skeleton/skeleton-content.directive';
import { SkeletonFactsComponent } from '@shared/ui/skeleton/skeleton-facts.component';
import { SkeletonFieldsComponent } from '@shared/ui/skeleton/skeleton-fields.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { ToastService } from '@shared/ui/toast/toast.service';
import { guestName } from '@shared/text/guest-text';
import { AdminContractsService } from '../data/admin-contracts.service';
import { ContractOptionsService } from '../data/contract-options.service';
import { CREATED_TEXT } from '../model/contract';
import {
  conflictOf,
  END_BEFORE_START_TEXT,
  dayProblem,
  draftFacts,
  EMPTY_FIELDS,
  endProblem,
  environmentOptions,
  environmentProblem,
  FILE_ACCEPT,
  FILE_FORMAT_TEXT,
  FILE_HELP,
  FILE_LABEL,
  FILE_PROMPT,
  fileProblem,
  feeProblem,
  graceProblem,
  guestOptions,
  guestProblem,
  LOAD_ERROR_TEXT,
  sideNote,
  SERVER_FIELD_TEXTS,
  SERVER_FIELDS,
  STORAGE_TEXT,
  startProblem,
  toNewContract,
} from '../model/contract-form';
import type {
  ContractConflict,
  ContractFields,
  Debt,
  Environment,
  GuestSummary,
} from '../model/contract-form';
import { CONTRACT_FORM_STYLES } from './contract-form.styles';

const GENERAL_ERROR_ID = 'contract-form-error';
const LIST = '/admin/contracts';

/** What the pickers need: the guests that can take a contract (or the one already chosen) and the environments. */
interface Choices {
  readonly guests: readonly GuestSummary[];
  readonly fixed: { readonly id: string; readonly name: string } | null;
  readonly environments: readonly Environment[];
}

/**
 * A4.1 «Cargar contrato» (CU-03, RF-03) on the canvas «ContratoNuevo»: the form on the left and,
 * on the right, what will be loaded. It is entered from A4 or, with the guest already chosen
 * (`?guestId=`), from A3.2, and goes back to where it came from with a toast. The PDF is not a field
 * of the form: a screen keeps it apart. The BFF's 409 come as a dialog that says what to do.
 */
@Component({
  selector: 'app-contract-form',
  imports: [
    FactTileComponent,
    FieldControlDirective,
    FileFieldComponent,
    FormField,
    FormFieldComponent,
    FormRoot,
    LoadErrorComponent,
    PageHeaderComponent,
    RouterLink,
    SkeletonBlockComponent,
    SkeletonComponent,
    SkeletonContentDirective,
    SkeletonFactsComponent,
    SkeletonFieldsComponent,
  ],
  templateUrl: './contract-form.component.html',
  styles: CONTRACT_FORM_STYLES,
})
export class ContractFormComponent {
  private readonly contracts = inject(AdminContractsService);
  private readonly options = inject(ContractOptionsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly toasts = inject(ToastService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  /** A value longer than this goes in the smaller figure so it does not break the tile. */
  protected readonly longValue = 24;
  protected readonly generalErrorId = GENERAL_ERROR_ID;
  protected readonly loadErrorText = LOAD_ERROR_TEXT;
  protected readonly fileLabel = FILE_LABEL;
  protected readonly filePrompt = FILE_PROMPT;
  protected readonly fileHelp = FILE_HELP;
  protected readonly fileAccept = FILE_ACCEPT;

  /** The guest it comes from (A3.2), or null when it comes from the list. */
  private guestId: string | null = null;

  private readonly loaded = new AsyncContentState<Choices>();
  protected readonly phase = computed(() => this.loaded.state().status);
  protected readonly retrying = this.loaded.retrying;

  protected readonly fields = signal<ContractFields>(EMPTY_FIELDS);
  private readonly file = signal<File | null>(null);
  private readonly tried = signal(false);
  /** What the BFF refused about the PDF, until another one is chosen. */
  private readonly fileRefused = signal<string | null>(null);
  protected readonly generalError = signal<string | null>(null);

  protected readonly contractForm = form(
    this.fields,
    (path) => {
      validate(path.guestId, ({ value }) => problem('guestId', guestProblem(value())));
      validate(path.environmentId, ({ value }) =>
        problem('environmentId', environmentProblem(value())),
      );
      validate(path.fee, ({ value }) => problem('fee', feeProblem(value())));
      validate(path.day, ({ value }) => problem('day', dayProblem(value())));
      validate(path.grace, ({ value }) => problem('grace', graceProblem(value())));
      validate(path.start, ({ value }) => problem('start', startProblem(value())));
      validate(path.end, ({ value, valueOf }) =>
        problem('end', endProblem(valueOf(path.start), value())),
      );
    },
    {
      submission: {
        action: () => this.save(),
        onInvalid: () => {
          this.tried.set(true);
          focusFirstProblem(this.host, this.injector, GENERAL_ERROR_ID);
        },
      },
    },
  );

  protected readonly saving = computed(() => this.contractForm().submitting());
  protected readonly fixedGuest = computed(() => this.loaded.data()?.fixed?.name ?? null);
  protected readonly guestChoices = computed(() => guestOptions(this.loaded.data()?.guests ?? []));
  protected readonly environmentChoices = computed(() =>
    environmentOptions(this.loaded.data()?.environments ?? []),
  );
  protected readonly back = computed(() => {
    const fixed = this.loaded.data()?.fixed;
    return fixed
      ? { link: ['/admin/guests', fixed.id], label: fixed.name }
      : { link: [LIST], label: 'Contratos' };
  });
  protected readonly fileName = computed(() => this.file()?.name ?? null);
  protected readonly fileError = computed(
    () => this.fileRefused() ?? (this.tried() ? fileProblem(this.file()) : null),
  );
  private readonly guestLabel = computed(() => {
    const fields = this.fields();
    const data = this.loaded.data();
    const fixed = data?.fixed;
    if (fixed) return fixed.name;
    const guest = data?.guests.find((item) => item.id === fields.guestId);
    return guest ? guestName(guest.name) : null;
  });
  private readonly environmentLabel = computed(() => {
    const id = this.fields().environmentId;
    const choice = this.environmentChoices().find((option) => option.value === id);
    return choice?.label.split(' · ')[0] ?? null;
  });
  protected readonly facts = computed(() =>
    draftFacts({ ...this.fields(), file: this.file() }, this.guestLabel(), this.environmentLabel()),
  );
  protected readonly note = computed(() => sideNote(this.guestLabel(), this.environmentLabel()));

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.loaded.dispose();
    });
    this.guestId = this.route.snapshot.queryParamMap.get('guestId');
    void this.load();
  }

  /** The message to show under a field: what is wrong once touched, or what the BFF refused. */
  protected error(name: keyof ContractFields): string | null {
    return firstError(this.contractForm[name]);
  }

  protected chooseFile(file: File | null): void {
    this.file.set(file);
    this.fileRefused.set(null);
  }

  protected reload(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    const request = this.loaded.begin(true);
    if (request === null) return;
    try {
      const choices = await firstValueFrom(this.read());
      if (this.loaded.succeed(request, choices)) {
        if (choices.fixed)
          this.fields.update((fields) => ({ ...fields, guestId: choices.fixed?.id ?? '' }));
      }
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse && error.status === 404 && this.guestId !== null) {
        this.toasts.show('No se encontró el registro.');
        void this.router.navigate([LIST]);
        return;
      }
      this.loaded.fail(request, LOAD_ERROR_TEXT);
    }
  }

  private read(): Observable<Choices> {
    const environments = this.options.environments();
    const id = this.guestId;
    if (id === null) {
      return forkJoin({ guests: this.options.guests(), environments }).pipe(
        map((value): Choices => ({ ...value, fixed: null })),
      );
    }
    return forkJoin({ guest: this.options.guest(id), environments }).pipe(
      map(({ guest, environments: all }): Choices => ({
        guests: [],
        fixed: { id: guest.id, name: guestName(guest.name) },
        environments: all,
      })),
    );
  }

  private async save() {
    this.generalError.set(null);
    this.tried.set(true);
    const input = toNewContract({ ...this.fields(), file: this.file() });
    if (input === null) {
      focusFirstProblem(this.host, this.injector, GENERAL_ERROR_ID);
      return undefined;
    }
    try {
      await firstValueFrom(this.contracts.create(input));
    } catch (error: unknown) {
      return this.failed(error);
    }
    this.toasts.show(CREATED_TEXT, { tone: 'success' });
    await this.router.navigate(this.back().link);
    return undefined;
  }

  /**
   * What the BFF refused, said with the texts of the catalog (QP-UI-17, SRS 17): a 409 as a dialog,
   * the dates and the file under their field, a field of the form under it and the rest above the
   * form. The text of the BFF itself is never shown.
   */
  private async failed(error: unknown) {
    const failure = toBffError(error);
    const code = bodyCodeOf(error) ?? failure.code;
    const conflict = conflictOf(
      code,
      { environment: this.environmentLabel() },
      this.debtsOf(error),
    );
    if (conflict !== null) {
      await this.conflict(conflict);
      return undefined;
    }
    focusFirstProblem(this.host, this.injector, GENERAL_ERROR_ID);
    if (code === 'CONTRACT_INVALID_FILE') {
      this.fileRefused.set(FILE_FORMAT_TEXT);
      return undefined;
    }
    if (code === 'CONTRACT_INVALID_DATES') {
      return [this.refusal('end', END_BEFORE_START_TEXT)];
    }
    const target = failure.field === undefined ? undefined : SERVER_FIELDS[failure.field];
    if (target !== undefined) return [this.refusal(target, SERVER_FIELD_TEXTS[target])];
    this.generalError.set(code === 'FILE_STORAGE_UNAVAILABLE' ? STORAGE_TEXT : failure.message);
    return undefined;
  }

  /** What the 409 GUEST_HAS_PENDING_DEBT says the guest owes (RN-25), oldest first. */
  private debtsOf(error: unknown): readonly Debt[] {
    if (!(error instanceof HttpErrorResponse)) return [];
    const body = error.error as { debts?: readonly Debt[] } | null;
    return body?.debts ?? [];
  }

  private refusal(name: keyof ContractFields, message: string) {
    return { fieldTree: this.field(name), kind: 'server', message };
  }

  /**
   * «Elegir otro ambiente», «Registrar pago» or «Entendido»: the dialog says what was refused. The
   * payment goes to A5.1 with the guest chosen (RN-23); the environment is cleared to choose again.
   */
  private async conflict(conflict: ContractConflict): Promise<void> {
    const actions: { label: string; value: string }[] = [
      { label: conflict.buttonLabel, value: conflict.next },
    ];
    if (conflict.closeLabel !== null) actions.push({ label: conflict.closeLabel, value: 'close' });
    const ref = openPaymentNoticeDialog(this.dialog, {
      title: conflict.title,
      message: conflict.message,
      actions,
    });
    const choice = await firstValueFrom(ref.afterClosed(), { defaultValue: undefined });
    if (conflict.next === 'environment') {
      this.fields.update((fields) => ({ ...fields, environmentId: '' }));
    } else if (conflict.next === 'pay' && choice === 'pay') {
      await this.router.navigate(['/admin/payments/new'], {
        queryParams: { guestId: this.fields().guestId },
      });
    }
  }

  // The explicit type breaks the circular inference between the form and its submit action.
  private field(name: keyof ContractFields): FieldTree<string> {
    return this.contractForm[name];
  }
}
