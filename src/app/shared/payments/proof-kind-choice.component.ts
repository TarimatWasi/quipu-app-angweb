import { Component, input, output } from '@angular/core';
import type { ProofDraft } from './proof-fields';

/** Presentation only: the owner keeps validation and any draft when the kind changes. */
@Component({
  selector: 'app-proof-kind-choice',
  host: { '[attr.aria-label]': 'label()', '[attr.role]': 'label() ? "group" : null' },
  template: `
    <div class="quipu-segmented">
      <button
        type="button"
        [attr.aria-pressed]="kind() === 'VOUCHER'"
        (click)="kindChange.emit('VOUCHER')"
      >
        Con voucher
      </button>
      <button
        type="button"
        [attr.aria-pressed]="kind() === 'CASH'"
        (click)="kindChange.emit('CASH')"
      >
        Efectivo, sin voucher
      </button>
    </div>
  `,
  styles: ':host { display: block; }',
})
export class ProofKindChoiceComponent {
  readonly kind = input.required<ProofDraft['kind']>();
  /** Omit when an enclosing fieldset already names the choice. */
  readonly label = input<string | null>(null);
  readonly kindChange = output<ProofDraft['kind']>();
}
