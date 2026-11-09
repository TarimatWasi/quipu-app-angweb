import { Component, computed, input, output, signal } from '@angular/core';
import { shrinkImage } from '../../files/shrink-image';

const CHOOSE_VOUCHER_TEXT = 'Elige la foto o el PDF del voucher';

/** What a voucher may be: JPG, PNG or PDF (RF-15). */
export const VOUCHER_ACCEPT = '.jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf';

/**
 * P-15 Zona de archivo (TAR-297): a dashed zone with «Elegir archivo» and, on a phone, «Tomar foto»
 * until a file is chosen; on a wide screen a file can also be dropped on it (TAR-341); then its name with «Cambiar» and, if the screen allows it, «Quitar». The
 * error and the help go under it, tied to the input. The screen validates the file it receives
 * (type and size) and decides what to keep: this only reports it.
 */
@Component({
  selector: 'app-file-field',
  template: `
    <div class="quipu-field">
      <input
        class="cdk-visually-hidden"
        type="file"
        [id]="fieldId()"
        [accept]="accept()"
        [attr.aria-label]="label()"
        [attr.aria-invalid]="error() ? 'true' : null"
        [attr.aria-describedby]="describedBy()"
        (change)="picked($event.target)"
      />
      @if (camera()) {
        <input
          class="cdk-visually-hidden"
          type="file"
          accept="image/*"
          capture="environment"
          [id]="cameraId()"
          [attr.aria-label]="label() + ' con la cámara'"
          [attr.aria-describedby]="describedBy()"
          (change)="picked($event.target)"
        />
      }
      @if (fileName(); as name) {
        <div class="file">
          <span class="file-name">{{ name }}</span>
          <span class="file-actions">
            <label class="quipu-button quipu-button--tertiary" [for]="fieldId()"
              >Cambiar<span class="cdk-visually-hidden"> {{ label() }}</span></label
            >
            @if (removable()) {
              <button
                class="quipu-button quipu-button--tertiary"
                type="button"
                (click)="chosen.emit(null)"
              >
                Quitar<span class="cdk-visually-hidden"> {{ label() }}</span>
              </button>
            }
          </span>
        </div>
      } @else {
        <div
          class="drop"
          [class.invalid]="error() !== null"
          [class.over]="over()"
          (dragover)="dragOver($event)"
          (dragleave)="over.set(false)"
          (drop)="dropped($event)"
        >
          <p class="drop-text">
            @if (widePrompt() === narrowPrompt()) {
              {{ narrowPrompt() }}
            } @else {
              <span class="only-wide">{{ widePrompt() }}</span>
              <span class="only-narrow">{{ narrowPrompt() }}</span>
            }
          </p>
          <span class="choices">
            <label class="quipu-button quipu-button--secondary" [for]="fieldId()"
              >Elegir archivo<span class="cdk-visually-hidden"> {{ label() }}</span></label
            >
            @if (camera()) {
              <label class="quipu-button quipu-button--secondary only-narrow" [for]="cameraId()"
                >Tomar foto<span class="cdk-visually-hidden"> para {{ label() }}</span></label
              >
            }
          </span>
        </div>
      }
      @if (error(); as message) {
        <p class="quipu-field-error" [id]="fieldId() + '-error'">{{ message }}</p>
      }
      <p class="quipu-field-help" [id]="fieldId() + '-help'">{{ help() }}</p>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .drop {
      display: grid;
      justify-items: center;
      gap: 0.75rem;
      padding: 1.5rem 1rem;
      border: var(--quipu-borde-ancho-enfasis) dashed var(--quipu-borde);
      border-radius: var(--quipu-radio);
      background: var(--quipu-piedra);
      text-align: center;
    }
    .drop.invalid {
      border-color: var(--quipu-error);
    }
    .drop.over {
      border-color: var(--quipu-chilca);
    }
    .drop-text {
      margin: 0;
      font-weight: var(--quipu-peso-enfasis);
    }
    .choices,
    .file-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.5rem;
    }
    .only-narrow {
      display: none;
    }
    @media (max-width: 599.98px) {
      .only-narrow {
        display: inline-flex;
      }
      .only-wide {
        display: none;
      }
    }
    .file {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem 1rem;
      padding: 0.75rem;
      border-radius: var(--quipu-radio);
      background: var(--quipu-piedra);
    }
    .file-name {
      font-weight: var(--quipu-peso-enfasis);
      overflow-wrap: anywhere;
    }
  `,
})
export class FileFieldComponent {
  readonly fieldId = input.required<string>();
  /** The name of the input, read by a screen reader («Archivo del voucher»). */
  readonly label = input('Archivo del voucher');
  /** The name of the file kept by the screen, or null while there is none. */
  readonly fileName = input<string | null>(null);
  /**
   * What the zone says. Left out, it is the voucher's: on a phone «Toma una foto…» when the camera
   * is offered, «Elige la foto…» when not; on a wide screen «Arrastra aquí…» (D-92).
   */
  readonly prompt = input<string | null>(null);
  /** What the zone says on a wide screen, where a file can be dropped; left out, the `prompt`. */
  readonly dropPrompt = input<string | null>(null);
  readonly help = input('JPG, PNG o PDF, hasta 5 MB.');
  readonly error = input<string | null>(null);
  readonly accept = input(VOUCHER_ACCEPT);
  /** «Tomar foto» on a phone, with the camera of the device; a photo is always an image. */
  readonly camera = input(true);
  /**
   * Offers «Quitar», which reports no file. Only for a file chosen on this screen: one already
   * stored is replaced with «Cambiar», not removed.
   */
  readonly removable = input(false);
  /** A file was chosen; null when the choice was cancelled or «Quitar» was pressed. */
  readonly chosen = output<File | null>();

  protected readonly cameraId = computed(() => `${this.fieldId()}-camera`);
  protected readonly narrowPrompt = computed(
    () =>
      this.prompt() ??
      (this.camera() ? 'Toma una foto del voucher o elige el archivo' : CHOOSE_VOUCHER_TEXT),
  );
  protected readonly widePrompt = computed(
    () => this.dropPrompt() ?? this.prompt() ?? 'Arrastra aquí la foto o el PDF del voucher',
  );
  /** A file is being dragged over the zone. */
  protected readonly over = signal(false);
  protected readonly describedBy = computed(
    () => `${this.fieldId()}${this.error() ? '-error' : '-help'}`,
  );

  protected picked(target: EventTarget | null): void {
    const input = target instanceof HTMLInputElement ? target : null;
    const file = input?.files?.[0] ?? null;
    // Choosing the same file again after an error must report it again.
    if (input) input.value = '';
    this.report(file);
  }

  protected dragOver(event: DragEvent): void {
    // Without this the browser opens the dragged file instead of dropping it here.
    event.preventDefault();
    this.over.set(true);
  }

  protected dropped(event: DragEvent): void {
    event.preventDefault();
    this.over.set(false);
    const file = event.dataTransfer?.files[0] ?? null;
    // Dropping something that is not a file (a text, a link) chooses nothing.
    if (file !== null) this.report(file);
  }

  private report(file: File | null): void {
    // An image is reduced here, once, so every screen receives what will be uploaded (TAR-315).
    if (file === null) this.chosen.emit(null);
    else
      void shrinkImage(file).then((reduced) => {
        this.chosen.emit(reduced);
      });
  }
}
