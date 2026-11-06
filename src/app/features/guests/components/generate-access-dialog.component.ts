import { DialogSubmission } from '@shared/forms/dialog-submission';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom, Observable } from 'rxjs';
import { DialogFrameComponent } from '@shared/ui/dialog-frame/dialog-frame.component';
import {
  ACCESS_LEAD,
  ACCESS_NOTE,
  ACCESS_OPTIONS,
  ACCESS_TITLE,
  accessProblem,
  ACTIVE_ACCESS_LEAD,
} from '../model/detail-actions';
import type { AccessGrant, AccessMode } from '../model/detail-actions';
import { callFailure } from '../model/new-guest';
import { NEW_GUEST_DIALOG_STYLES } from './new-guest-dialog.styles';

export interface GenerateAccessData {
  /** An active guest keeps its password until it uses the new access: the lead says so. */
  readonly active: boolean;
  /** The call to the BFF; the page owns the data, the dialog only the choice. */
  readonly generate: (mode: AccessMode) => Observable<AccessGrant>;
}

const LEAD_ID = 'generate-access-lead';
const ERROR_ID = 'generate-access-error';

/** The two big options of «Cómo se lo entregas»: the chosen one with an obsidian border. */
const OPTION_STYLES = `
  fieldset {
    display: grid;
    gap: var(--quipu-franja);
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
  }
  legend {
    padding: 0;
    margin-bottom: var(--quipu-espacio-campo);
  }
  .option {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 0.25rem 0.75rem;
    padding: var(--quipu-relleno-tarjeta);
    border: var(--quipu-borde-ancho-enfasis) solid transparent;
    border-radius: var(--quipu-radio);
    background: var(--quipu-piedra);
    cursor: pointer;
  }
  .option:has(input:checked) {
    border-color: var(--quipu-obsidiana);
  }
  .option input {
    grid-row: span 2;
    width: 1.25rem;
    height: 1.25rem;
    margin: 0.125rem 0 0;
    accent-color: var(--quipu-obsidiana);
  }
  .name {
    font-weight: var(--quipu-peso-enfasis);
  }
  .help {
    font: var(--mat-sys-body-small);
    color: var(--quipu-tinta-secundaria);
  }
  .note {
    font: var(--mat-sys-body-medium);
    color: var(--quipu-tinta-secundaria);
  }
`;

/**
 * A3.4 «Generar otro acceso» (RF-17, CU-13) on P-16: how the access is handed over, a link
 * (recommended) or a temporary password. It answers the access once generated; the page keeps it
 * in memory for A3.7 (FE-ANG-SEC-02). Any failure stays inside, in red.
 */
@Component({
  selector: 'app-generate-access-dialog',
  imports: [DialogFrameComponent],
  template: `
    <app-dialog-frame [heading]="title">
      <div class="body">
        <p [id]="leadId">{{ lead }}</p>
        <fieldset role="radiogroup" aria-labelledby="access-mode-legend">
          <legend id="access-mode-legend" class="quipu-label">Cómo se lo entregas</legend>
          @for (option of options; track option.mode) {
            <label class="option">
              <input
                type="radio"
                name="access-mode"
                [value]="option.mode"
                [checked]="mode() === option.mode"
                [disabled]="busy()"
                [attr.aria-labelledby]="'access-mode-name-' + option.mode"
                [attr.aria-describedby]="'access-mode-' + option.mode"
                (change)="mode.set(option.mode)"
              />
              <span class="name" [id]="'access-mode-name-' + option.mode">{{ option.label }}</span>
              <span class="help" [id]="'access-mode-' + option.mode">{{ option.help }}</span>
            </label>
          }
        </fieldset>
        <p class="note">{{ note }}</p>
        @if (error(); as message) {
          <p class="quipu-alert" role="alert" [id]="errorId">{{ message }}</p>
        }
      </div>
      <ng-container dialogActions>
        <button
          class="quipu-button quipu-button--tertiary"
          type="button"
          [disabled]="busy()"
          (click)="cancel()"
        >
          Cancelar
        </button>
        <button
          class="quipu-button quipu-button--primary"
          type="button"
          [disabled]="busy()"
          (click)="generate()"
        >
          {{ busy() ? 'Generando…' : 'Generar acceso' }}
        </button>
      </ng-container>
    </app-dialog-frame>
  `,
  styles: [NEW_GUEST_DIALOG_STYLES, OPTION_STYLES],
})
export class GenerateAccessDialogComponent {
  private readonly ref =
    inject<MatDialogRef<GenerateAccessDialogComponent, AccessGrant>>(MatDialogRef);
  private readonly submission = new DialogSubmission(this.ref);
  private readonly data = inject<GenerateAccessData>(MAT_DIALOG_DATA);

  protected readonly title = ACCESS_TITLE;
  protected readonly lead = this.data.active ? ACTIVE_ACCESS_LEAD : ACCESS_LEAD;
  protected readonly note = ACCESS_NOTE;
  protected readonly options = ACCESS_OPTIONS;
  protected readonly leadId = LEAD_ID;
  protected readonly errorId = ERROR_ID;
  protected readonly mode = signal<AccessMode>('LINK');
  protected readonly busy = this.submission.pending;
  protected readonly error = signal<string | null>(null);

  protected cancel(): void {
    this.ref.close();
  }

  protected async generate(): Promise<void> {
    return this.submission.run(async () => {
      this.error.set(null);
      try {
        const grant = await firstValueFrom(this.data.generate(this.mode()));
        this.finish(grant);
      } catch (error: unknown) {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          // The session interceptor already forgot the session and goes to the login.
          this.finish();
          return;
        }
        this.error.set(accessProblem(callFailure(error)));
      }
    });
  }

  private finish(grant?: AccessGrant): void {
    this.ref.close(grant);
  }
}

export function openGenerateAccessDialog(
  dialog: MatDialog,
  data: GenerateAccessData,
): MatDialogRef<GenerateAccessDialogComponent, AccessGrant> {
  return dialog.open<GenerateAccessDialogComponent, GenerateAccessData, AccessGrant>(
    GenerateAccessDialogComponent,
    {
      ariaDescribedBy: LEAD_ID,
      data,
      width: 'var(--quipu-dialogo-ancho)',
      maxWidth: 'calc(100vw - 2rem)',
    },
  );
}
