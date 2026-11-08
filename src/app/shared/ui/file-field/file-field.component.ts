import { Component, computed, input, output } from '@angular/core';
import { shrinkImage } from '../../files/shrink-image';

/** What a voucher may be: JPG, PNG or PDF (RF-15). */
export const VOUCHER_ACCEPT = '.jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf';

/**
 * P-15 Zona de archivo (TAR-297): a dashed zone with «Elegir archivo» and, on a phone, «Tomar foto»
 * until a file is chosen; then its name with «Cambiar» and, if the screen allows it, «Quitar». The
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
        <div class="drop" [class.invalid]="error() !== null">
          <p class="drop-text">{{ prompt() }}</p>
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
  readonly prompt = input('Elige la foto o el PDF del voucher');
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
  protected readonly describedBy = computed(
    () => `${this.fieldId()}${this.error() ? '-error' : '-help'}`,
  );

  protected picked(target: EventTarget | null): void {
    const input = target instanceof HTMLInputElement ? target : null;
    const file = input?.files?.[0] ?? null;
    // Choosing the same file again after an error must report it again.
    if (input) input.value = '';
    // An image is reduced here, once, so every screen receives what will be uploaded (TAR-315).
    if (file === null) this.chosen.emit(null);
    else
      void shrinkImage(file).then((reduced) => {
        this.chosen.emit(reduced);
      });
  }
}
