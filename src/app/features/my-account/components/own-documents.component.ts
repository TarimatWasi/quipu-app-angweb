import { Component, computed, input, output } from '@angular/core';
import { shrinkImage } from '@shared/files/shrink-image';
import { PageNoticeComponent } from '@shared/ui/page-notice/page-notice.component';
import { NO_DOCUMENTS_TEXT, UPLOAD_NOTE, limitText, uploadHelp } from '../model/own-profile';
import type { OwnDocumentRow } from '../model/own-profile';

/**
 * H5 and T3 «Tus documentos (n de 5)»: the files the guest has uploaded, each with «Ver documento»,
 * and the way to add one: «Subir documento» chooses a file, which waits as «Por subir» with
 * «Quitar» until it is sent. The guest can neither delete nor replace a document (RN-37). It only
 * shows and reports: the page validates, sends and opens.
 */
@Component({
  selector: 'app-own-documents',
  imports: [PageNoticeComponent],
  template: `
    <section aria-labelledby="own-documents-title" class="block">
      <h2 id="own-documents-title">
        Tus documentos <span class="count">({{ rows().length }} de {{ limit() }})</span>
      </h2>
      @if (rows().length > 0) {
        <ul class="quipu-card-list" aria-labelledby="own-documents-title">
          @for (row of rows(); track row.id) {
            <li class="quipu-card item">
              <span class="what">
                <strong>{{ row.name }}</strong>
                <span class="meta">{{ row.meta }}</span>
              </span>
              <button
                class="quipu-button quipu-button--tertiary"
                type="button"
                (click)="view.emit(row)"
              >
                Ver documento<span class="cdk-visually-hidden"> {{ row.name }}</span>
              </button>
            </li>
          }
        </ul>
      } @else {
        <p class="quipu-card empty">{{ emptyText }}</p>
      }

      @if (chosen(); as file) {
        <div class="chosen" [class.invalid]="error() !== null">
          <p class="label">Por subir</p>
          <div class="item">
            <span class="what">
              <strong>{{ file.name }}</strong>
            </span>
            <button
              class="quipu-button quipu-button--tertiary"
              type="button"
              [disabled]="uploading()"
              (click)="pick.emit(null)"
            >
              Quitar<span class="cdk-visually-hidden"> {{ file.name }}</span>
            </button>
          </div>
          @if (error(); as message) {
            <p class="quipu-field-error" role="alert">{{ message }}</p>
          }
          <p class="meta">{{ uploadNote }}</p>
          <button
            class="quipu-button quipu-button--primary"
            type="button"
            [disabled]="uploading() || error() !== null"
            (click)="upload.emit()"
          >
            {{ uploading() ? 'Subiendo…' : 'Subir documento' }}
          </button>
        </div>
      }

      <input
        id="own-document-file"
        class="cdk-visually-hidden"
        type="file"
        [accept]="accept"
        aria-label="Archivo del documento"
        (change)="picked($event.target)"
      />
      @if (canAdd()) {
        <label class="quipu-button quipu-button--secondary add" for="own-document-file"
          >Subir documento</label
        >
      }
      @if (full()) {
        <app-page-notice tone="info">{{ limitMessage() }}</app-page-notice>
      }
      <p class="meta">{{ help() }}</p>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    .block {
      display: grid;
      gap: 0.875rem;
    }
    h2,
    p {
      margin: 0;
    }
    .count {
      font-weight: normal;
      color: var(--quipu-tinta-secundaria);
    }
    .item {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem 1rem;
    }
    .what {
      display: grid;
      flex: 1 1 10rem;
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .meta {
      font: var(--mat-sys-body-small);
      color: var(--quipu-tinta-secundaria);
    }
    .empty {
      padding: var(--quipu-relleno-tarjeta);
    }
    .chosen {
      display: grid;
      gap: 0.5rem;
      padding: var(--quipu-relleno-tarjeta);
      border-radius: var(--quipu-radio);
      background: var(--quipu-piedra-oscura);
    }
    .chosen.invalid {
      outline: var(--quipu-borde-ancho-enfasis) solid var(--quipu-error);
    }
    .label {
      font: var(--mat-sys-label-large);
      color: var(--quipu-tinta-secundaria);
    }
    .add {
      justify-self: start;
    }
    @media (max-width: 599.98px) {
      .add,
      .chosen .quipu-button--primary {
        justify-self: stretch;
        width: 100%;
      }
    }
  `,
})
export class OwnDocumentsComponent {
  readonly rows = input.required<readonly OwnDocumentRow[]>();
  /** How many documents a guest may have (5, RN-37). */
  readonly limit = input.required<number>();
  /** The file chosen and still to upload. */
  readonly chosen = input<File | null>(null);
  /** What is wrong with the chosen file, or the limit; it keeps «Subir documento» from sending. */
  readonly error = input<string | null>(null);
  readonly uploading = input(false);

  /** A file was chosen; null when «Quitar» was pressed or the choice was cancelled. */
  readonly pick = output<File | null>();
  readonly upload = output();
  readonly view = output<OwnDocumentRow>();

  protected readonly accept = '.jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf';
  protected readonly emptyText = NO_DOCUMENTS_TEXT;
  protected readonly uploadNote = UPLOAD_NOTE;
  protected readonly full = computed(() => this.rows().length >= this.limit());
  protected readonly canAdd = computed(() => !this.full() && this.chosen() === null);
  protected readonly help = computed(() => uploadHelp(this.limit()));
  protected readonly limitMessage = computed(() => limitText(this.limit()));

  protected picked(target: EventTarget | null): void {
    const input = target instanceof HTMLInputElement ? target : null;
    const file = input?.files?.[0] ?? null;
    // Choosing the same file again after «Quitar» must report it again.
    if (input) input.value = '';
    // An image is reduced before it is kept for upload (TAR-315).
    if (file === null) this.pick.emit(null);
    else
      void shrinkImage(file).then((reduced) => {
        this.pick.emit(reduced);
      });
  }
}
