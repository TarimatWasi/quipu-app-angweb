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
import { FieldTree, form, FormField, FormRoot, validate } from '@angular/forms/signals';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { toBffErrorWithServerMessage } from '@core/http/bff-error';
import { isConcurrentModification, withVersion } from '@core/http/concurrent-modification';
import { openConcurrentModificationDialog } from '@shared/concurrent-modification/concurrent-modification-dialog.component';
import { AsyncContentState } from '@shared/data/async-content';
import { firstError, focusFirstProblem } from '@shared/forms/form-feedback';
import { FactTileComponent } from '@shared/ui/fact-tile/fact-tile.component';
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
import { AdminEnvironmentsService } from '../data/admin-environments.service';
import {
  changesOf,
  CODE_HELP_TEXT,
  CODE_TAKEN_TEXT,
  codeProblem,
  CREATED_TEXT,
  draftFacts,
  draftOf,
  isDirty,
  LOAD_ERROR_TEXT,
  loadedFacts,
  NOT_FOUND_TEXT,
  TYPE_LABELS,
  UPDATED_TEXT,
} from '../model/environment';
import type { Environment, EnvironmentDraft, EnvironmentType } from '../model/environment';
import { ENVIRONMENT_FORM_STYLES } from './environment-form.styles';

const EMPTY: EnvironmentDraft = { code: '', type: '' };
const TYPES: readonly EnvironmentType[] = ['ROOM', 'CABIN'];
const GENERAL_ERROR_ID = 'environment-form-error';

/**
 * A2.1 «Nuevo ambiente» (CU-01) and A2.4 «Editar ambiente» (GET, then PATCH with the `version` it
 * was loaded with, BE-SPR-DAT-13) on the canvas «AmbienteForm»: the form on the left and, on the
 * right, what will be created or how it is today. The type is closed and chosen with buttons (P-21).
 * It goes back to A2 with a toast; a conflict asks to reload, and a button that cannot be pressed
 * says why next to it (QP-UI-15).
 */
@Component({
  selector: 'app-environment-form',
  imports: [
    FactTileComponent,
    FieldControlDirective,
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
  templateUrl: './environment-form.component.html',
  styles: ENVIRONMENT_FORM_STYLES,
})
export class EnvironmentFormComponent implements OnInit {
  private readonly service = inject(AdminEnvironmentsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly toasts = inject(ToastService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  /** A value longer than this goes in the smaller figure so it does not break the tile. */
  protected readonly longValue = 24;
  protected readonly types = TYPES;
  protected readonly typeLabels = TYPE_LABELS;
  protected readonly codeHelp = CODE_HELP_TEXT;
  protected readonly generalErrorId = GENERAL_ERROR_ID;
  protected readonly loadErrorText = LOAD_ERROR_TEXT;

  /** The id of the environment being edited, or null when a new one is created. */
  private id: string | null = null;
  protected readonly editing = signal(false);

  private readonly loaded = new AsyncContentState<Environment>();
  /** A new environment has nothing to load: its form is ready at once. */
  protected readonly phase = computed(() =>
    this.editing() ? this.loaded.state().status : 'ready',
  );
  protected readonly view = this.loaded.state;
  protected readonly retrying = computed(() => {
    const state = this.view();
    return state.status === 'initial-error' && state.retrying;
  });
  protected readonly generalError = signal<string | null>(null);
  protected readonly draft = signal<EnvironmentDraft>(EMPTY);

  protected readonly envForm = form(
    this.draft,
    (path) => {
      validate(path.code, ({ value }) => {
        const message = codeProblem(value());
        return message === null ? undefined : { kind: 'code', message };
      });
    },
    {
      submission: {
        action: () => this.save(),
        onInvalid: () => {
          focusFirstProblem(this.host, this.injector, GENERAL_ERROR_ID);
        },
      },
    },
  );

  protected readonly codeError = computed(() => firstError(this.envForm.code));
  protected readonly saving = computed(() => this.envForm().submitting());
  protected readonly title = computed(() => {
    const environment = this.loaded.data();
    return environment === null ? 'Nuevo ambiente' : `Editar ambiente ${environment.code}`;
  });
  protected readonly sideTitle = computed(() =>
    this.editing() ? 'Cómo está hoy' : 'Lo que se va a crear',
  );
  protected readonly facts = computed(() => {
    const environment = this.loaded.data();
    return environment === null ? draftFacts(this.draft()) : loadedFacts(environment);
  });
  /** Nothing to save: nothing changed (edit) or the type is missing (create). */
  protected readonly reason = computed(() => {
    const environment = this.loaded.data();
    if (environment === null) {
      return this.draft().type === '' ? 'Elige el tipo para crear el ambiente.' : null;
    }
    return isDirty(environment, this.draft()) ? null : 'Cambia el código o el tipo para guardar.';
  });
  protected readonly saveLabel = computed(() => {
    if (this.editing()) return this.saving() ? 'Guardando…' : 'Guardar cambios';
    return this.saving() ? 'Creando…' : 'Crear ambiente';
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.loaded.dispose();
    });
  }

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    if (this.id === null) return;
    this.editing.set(true);
    void this.load(this.id);
  }

  protected chooseType(type: EnvironmentType): void {
    this.draft.update((draft) => ({ ...draft, type }));
  }

  protected reload(): void {
    if (this.id !== null) void this.load(this.id);
  }

  private async load(id: string): Promise<void> {
    const request = this.loaded.begin(true);
    if (request === null) return;
    try {
      const environment = await firstValueFrom(this.service.get(id));
      if (this.loaded.succeed(request, environment)) {
        this.draft.set(draftOf(environment));
        this.generalError.set(null);
      }
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        this.toasts.show(NOT_FOUND_TEXT);
        void this.router.navigate(['/admin/environments']);
        return;
      }
      this.loaded.fail(request, LOAD_ERROR_TEXT);
    }
  }

  private async save() {
    this.generalError.set(null);
    const environment = this.loaded.data();
    const { code, type } = this.draft();
    try {
      if (environment === null) {
        if (type === '') return undefined;
        await firstValueFrom(this.service.create({ code: code.trim(), type }));
      } else {
        await firstValueFrom(
          this.service.update(
            environment.id,
            withVersion(environment, changesOf(environment, this.draft())),
          ),
        );
      }
    } catch (error: unknown) {
      return this.failed(error);
    }
    this.toasts.show(environment === null ? CREATED_TEXT : UPDATED_TEXT, { tone: 'success' });
    await this.router.navigate(['/admin/environments']);
    return undefined;
  }

  private async failed(error: unknown) {
    if (isConcurrentModification(error)) {
      await this.concurrent();
      return undefined;
    }
    const failure = toBffErrorWithServerMessage(error);
    if (failure.code === 'ENVIRONMENT_CODE_TAKEN') {
      focusFirstProblem(this.host, this.injector, GENERAL_ERROR_ID);
      return [{ fieldTree: this.codeField(), kind: 'server', message: CODE_TAKEN_TEXT }];
    }
    if (error instanceof HttpErrorResponse && error.status === 404) {
      this.toasts.show(NOT_FOUND_TEXT);
      await this.router.navigate(['/admin/environments']);
      return undefined;
    }
    this.generalError.set(failure.message);
    focusFirstProblem(this.host, this.injector, GENERAL_ERROR_ID);
    return undefined;
  }

  /** «El ambiente cambió»: reload it (nothing was saved) or go back to A2. */
  private async concurrent(): Promise<void> {
    const ref = openConcurrentModificationDialog(this.dialog, {
      title: 'El ambiente cambió',
      backLabel: 'Volver a Ambientes',
    });
    const choice = await firstValueFrom(ref.afterClosed());
    if (choice === 'reload') this.reload();
    else if (choice === 'back') await this.router.navigate(['/admin/environments']);
  }

  // The explicit type breaks the circular inference between the form and its submit action.
  private codeField(): FieldTree<string> {
    return this.envForm.code;
  }
}
