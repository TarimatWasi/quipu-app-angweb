import { Component, input, output } from '@angular/core';
import { ChoiceGroupComponent } from '@shared/ui/choice-group/choice-group.component';
import type { ChoiceOption } from '@shared/ui/choice-group/choice-group.component';
import type { ProofDraft } from './proof-fields';

const OPTIONS: readonly ChoiceOption<ProofDraft['kind']>[] = [
  { value: 'VOUCHER', label: 'Con voucher' },
  { value: 'CASH', label: 'Efectivo, sin voucher' },
];

/** The kind of a proof as an `app-choice-group` (P-21). The owner keeps validation and any draft. */
@Component({
  selector: 'app-proof-kind-choice',
  host: { '[attr.aria-label]': 'label()', '[attr.role]': 'label() ? "group" : null' },
  imports: [ChoiceGroupComponent],
  template: `
    <app-choice-group
      [options]="options"
      [value]="kind()"
      (valueChange)="kindChange.emit(asKind($event))"
    />
  `,
  styles: ':host { display: block; }',
})
export class ProofKindChoiceComponent {
  readonly kind = input.required<ProofDraft['kind']>();
  /** Omit when an enclosing fieldset already names the choice. */
  readonly label = input<string | null>(null);
  readonly kindChange = output<ProofDraft['kind']>();

  protected readonly options = OPTIONS;

  protected asKind(value: string): ProofDraft['kind'] {
    return value === 'CASH' ? 'CASH' : 'VOUCHER';
  }
}
