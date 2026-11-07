import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, ElementRef, inject, Injector, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom, Observable } from 'rxjs';
import { DialogSubmission } from '@shared/forms/dialog-submission';
import { focusFirstProblem } from '@shared/forms/form-feedback';
import { ChoiceGroupComponent } from '@shared/ui/choice-group/choice-group.component';
import { DialogFrameComponent } from '@shared/ui/dialog-frame/dialog-frame.component';
import { FileFieldComponent } from '@shared/ui/file-field/file-field.component';
import { FieldControlDirective } from '@shared/ui/form-field/field-control.directive';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';
import {
  actionLead,
  actionProblem,
  actionRequest,
  actionSubmitLabel,
  actionTitle,
  CHANNEL_OPTIONS,
  draftProblems,
  EMPTY_DRAFT,
  isValidDocumentFile,
  MAX_NOTE_LENGTH,
  NEW_FILE_PROMPT,
  NOTE_HELP,
  REASON_OPTIONS,
} from '../model/documents';
import type {
  ActionDraft,
  ActionKind,
  DocumentActionReason,
  DocumentActionRequest,
  DocumentRequestChannel,
  DraftField,
  DraftProblems,
} from '../model/documents';
import { callFailure } from '../model/new-guest';
import { NEW_GUEST_DIALOG_STYLES } from './new-guest-dialog.styles';

/** What the dialog hands the page to send: the request and, when replacing, the new file. */
export interface DocumentActionInput {
  readonly request: DocumentActionRequest;
  readonly file: File | null;
}

export interface DocumentActionData {
  readonly kind: ActionKind;
  /** The file name of the document, as the title says it. */
  readonly name: string;
  /** Today in Lima, yyyy-mm-dd: the latest day an ARCO request can have. */
  readonly today: string;
  /** The call to the BFF; the page owns the data, the dialog only the form. */
  readonly run: (input: DocumentActionInput) => Observable<unknown>;
}

const LEAD_ID = 'document-action-lead';
const ERROR_ID = 'document-action-error';

/**
 * A3.8 «Borrar» and «Reemplazar» a document (RN-37, CU-29) on P-16: why (an ARCO request of the
 * holder or an upload error), and, for ARCO, the day and the channel of the request; a note that
 * is only a reference; and, replacing, the new file. It checks before calling the BFF
 * (FE-ANG-FRM-03); a field the BFF refuses goes under it, anything else above the buttons, and the
 * dialog stays open so the administrator can fix it or try again. Answers true once done.
 */
@Component({
  selector: 'app-document-action-dialog',
  imports: [
    ChoiceGroupComponent,
    DialogFrameComponent,
    FieldControlDirective,
    FileFieldComponent,
    FormFieldComponent,
  ],
  templateUrl: './document-action-dialog.component.html',
  styles: [
    NEW_GUEST_DIALOG_STYLES,
    `
      .date {
        max-width: 14rem;
      }
    `,
  ],
})
export class DocumentActionDialogComponent {
  private readonly ref = inject<MatDialogRef<DocumentActionDialogComponent, boolean>>(MatDialogRef);
  private readonly submission = new DialogSubmission(this.ref);
  private readonly data = inject<DocumentActionData>(MAT_DIALOG_DATA);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly kind = this.data.kind;
  protected readonly today = this.data.today;
  protected readonly title = actionTitle(this.data.kind, this.data.name);
  protected readonly lead = actionLead(this.data.kind);
  protected readonly leadId = LEAD_ID;
  protected readonly errorId = ERROR_ID;
  protected readonly reasons = REASON_OPTIONS;
  protected readonly channels = CHANNEL_OPTIONS;
  protected readonly noteHelp = NOTE_HELP;
  protected readonly maxNote = MAX_NOTE_LENGTH;
  protected readonly filePrompt = NEW_FILE_PROMPT;

  protected readonly draft = signal<ActionDraft>(EMPTY_DRAFT);
  private readonly submitted = signal(false);
  /** A field the BFF refused, until the administrator changes something. */
  private readonly refused = signal<{ field: DraftField; message: string } | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly sending = this.submission.pending;
  protected readonly submitLabel = computed(() => actionSubmitLabel(this.kind, this.sending()));

  private readonly problems = computed(() => draftProblems(this.draft(), this.kind, this.today));
  /** What each field shows: what is missing once a send was tried, or what the BFF refused. */
  protected readonly shown = computed<DraftProblems>(() => {
    // A file that cannot be used is said at once; the rest waits for a try to send.
    const own = this.submitted()
      ? this.problems()
      : this.draft().fileInvalid
        ? { file: this.problems().file }
        : {};
    const refused = this.refused();
    return refused === null ? own : { ...own, [refused.field]: refused.message };
  });

  protected valueOf(event: Event): string {
    return event.target instanceof HTMLInputElement ? event.target.value : '';
  }

  protected set(field: 'reason' | 'requestedAt' | 'channel' | 'note', value: string): void {
    this.touch();
    this.draft.update((draft) => {
      switch (field) {
        case 'reason':
          return { ...draft, reason: value as DocumentActionReason };
        case 'channel':
          return { ...draft, channel: value as DocumentRequestChannel };
        case 'requestedAt':
          return { ...draft, requestedAt: value };
        case 'note':
          return { ...draft, note: value };
      }
    });
  }

  protected pickFile(chosen: File | null): void {
    this.touch();
    // No file is «Quitar» or a cancelled choice: the zone goes back to asking for one.
    const valid = chosen !== null && isValidDocumentFile(chosen);
    this.draft.update((draft) => ({
      ...draft,
      file: valid ? chosen : null,
      fileInvalid: chosen !== null && !valid,
    }));
  }

  protected cancel(): void {
    this.ref.close();
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    this.submitted.set(true);
    if (Object.keys(this.problems()).length > 0) {
      focusFirstProblem(this.host, this.injector, ERROR_ID);
      return;
    }
    await this.submission.run(() => this.send());
  }

  /** A change of the form clears what the BFF said about the last try. */
  private touch(): void {
    this.refused.set(null);
    this.error.set(null);
  }

  private async send(): Promise<void> {
    this.touch();
    const draft = this.draft();
    try {
      await firstValueFrom(this.data.run({ request: actionRequest(draft), file: draft.file }), {
        defaultValue: null,
      });
      this.ref.close(true);
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        // The session interceptor already forgot the session and goes to the login.
        this.ref.close();
        return;
      }
      const problem = actionProblem(callFailure(error));
      if (problem.place === 'field') {
        this.refused.set({ field: problem.field, message: problem.message });
      } else {
        this.error.set(problem.message);
      }
      focusFirstProblem(this.host, this.injector, ERROR_ID);
    }
  }
}

/** Opens «Borrar» or «Reemplazar»; `afterClosed()` gives true once the action is done. */
export function openDocumentActionDialog(
  dialog: MatDialog,
  data: DocumentActionData,
): MatDialogRef<DocumentActionDialogComponent, boolean> {
  return dialog.open<DocumentActionDialogComponent, DocumentActionData, boolean>(
    DocumentActionDialogComponent,
    {
      ariaDescribedBy: LEAD_ID,
      data,
      width: 'var(--quipu-dialogo-ancho)',
      maxWidth: 'calc(100vw - 2rem)',
    },
  );
}
