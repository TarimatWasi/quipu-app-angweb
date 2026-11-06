import { Component, computed, input, output } from '@angular/core';

/** What a voucher may be: JPG, PNG or PDF (RF-15). */
export const VOUCHER_ACCEPT = '.jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf';

/**
 * P-12 Subida de archivo (TAR-297): a dashed zone with «Elegir archivo» until a file is chosen,
 * then its name with «Cambiar»; the error and the help go under it, tied to the input. The screen
 * validates the file it receives (type and size) and decides what to keep: this only reports it.
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
      @if (fileName(); as name) {
        <div class="file">
          <span class="file-name">{{ name }}</span>
          <label class="quipu-button quipu-button--tertiary" [for]="fieldId()"
            >Cambiar<span class="cdk-visually-hidden"> {{ label() }}</span></label
          >
        </div>
      } @else {
        <div class="drop" [class.invalid]="error() !== null">
          <p class="drop-text">{{ prompt() }}</p>
          <label class="quipu-button quipu-button--secondary" [for]="fieldId()"
            >Elegir archivo<span class="cdk-visually-hidden"> {{ label() }}</span></label
          >
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
  /** A file was chosen (null when the choice was cancelled). */
  readonly chosen = output<File | null>();

  protected readonly describedBy = computed(
    () => `${this.fieldId()}${this.error() ? '-error' : '-help'}`,
  );

  protected picked(target: EventTarget | null): void {
    const input = target instanceof HTMLInputElement ? target : null;
    this.chosen.emit(input?.files?.[0] ?? null);
    // Choosing the same file again after an error must report it again.
    if (input) input.value = '';
  }
}
