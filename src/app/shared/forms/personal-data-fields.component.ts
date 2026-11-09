import { Component, computed, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { ChoiceGroupComponent } from '@shared/ui/choice-group/choice-group.component';
import type { ChoiceOption } from '@shared/ui/choice-group/choice-group.component';
import { FieldControlDirective } from '@shared/ui/form-field/field-control.directive';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';
import { firstError } from './form-feedback';
import {
  EMAIL_HELP,
  EMERGENCY_NAME_HELP,
  NAME_HELP,
  PHONE_HELP,
  RELATIONSHIPS,
} from './personal-data';
import type { PersonalData } from './personal-data';

const KIN_OPTIONS: readonly ChoiceOption[] = RELATIONSHIPS.map((value) => ({
  value,
  label: value,
}));

/**
 * The fields of the personal data of a guest (H5, T3, O1) on the P-14 form: contact data and the
 * optional emergency contact, each with its help and the error under it. The rules and the
 * submission stay with the form that owns it (`personalDataRules`); this only draws the fields.
 */
@Component({
  selector: 'app-personal-data-fields',
  imports: [ChoiceGroupComponent, FieldControlDirective, FormField, FormFieldComponent],
  template: `
    <section class="block" [attr.aria-labelledby]="prefix() + '-contact'">
      <h2 [id]="prefix() + '-contact'">Tus datos de contacto</h2>
      <div class="fields">
        <app-form-field
          [fieldId]="prefix() + '-name'"
          label="Nombre completo"
          [help]="nameHelp"
          [error]="nameError()"
        >
          <input
            appFieldControl
            class="quipu-input"
            type="text"
            autocomplete="name"
            aria-required="true"
            [formField]="form().name"
          />
        </app-form-field>
        <app-form-field
          [fieldId]="prefix() + '-phone'"
          label="Teléfono"
          [help]="phoneHelp"
          [error]="phoneError()"
        >
          <input
            appFieldControl
            class="quipu-input"
            type="tel"
            inputmode="tel"
            autocomplete="tel"
            aria-required="true"
            [formField]="form().phone"
          />
        </app-form-field>
        <app-form-field
          [fieldId]="prefix() + '-email'"
          label="Correo"
          [optional]="true"
          [help]="emailHelp"
          [error]="emailError()"
        >
          <input
            appFieldControl
            class="quipu-input"
            type="email"
            inputmode="email"
            autocomplete="email"
            [formField]="form().contactEmail"
          />
        </app-form-field>
      </div>
    </section>

    <section class="block" [attr.aria-labelledby]="prefix() + '-emergency'">
      <h2 [id]="prefix() + '-emergency'">
        Contacto de emergencia <span class="optional">(opcional)</span>
      </h2>
      @if (emergencyHint(); as hint) {
        <p class="hint">{{ hint }}</p>
      }
      <div class="fields">
        <app-form-field
          [fieldId]="prefix() + '-emergency-name'"
          label="Nombre"
          [help]="emergencyHelp"
          [error]="emergencyNameError()"
        >
          <input
            appFieldControl
            class="quipu-input"
            type="text"
            autocomplete="off"
            [formField]="form().emergencyName"
          />
        </app-form-field>
        <app-form-field
          [fieldId]="prefix() + '-emergency-relationship'"
          label="Parentesco"
          [error]="relationshipError()"
        >
          <div class="relationship">
            <input
              appFieldControl
              class="quipu-input"
              type="text"
              autocomplete="off"
              [formField]="form().emergencyRelationship"
            />
            <div role="group" aria-label="Elegir parentesco">
              <app-choice-group
                [options]="kinOptions"
                [value]="relationship()"
                (valueChange)="chooseRelationship($event)"
              />
            </div>
          </div>
        </app-form-field>
        <app-form-field
          [fieldId]="prefix() + '-emergency-phone'"
          label="Celular"
          [error]="emergencyPhoneError()"
        >
          <input
            appFieldControl
            class="quipu-input"
            type="tel"
            inputmode="tel"
            autocomplete="off"
            [formField]="form().emergencyPhone"
          />
        </app-form-field>
      </div>
    </section>
  `,
  styles: `
    :host {
      display: grid;
      gap: 2.25rem;
    }
    .block {
      display: grid;
      gap: 0.875rem;
    }
    h2 {
      margin: 0;
    }
    .hint {
      margin: 0;
      font: var(--mat-sys-body-medium);
      color: var(--quipu-tinta-secundaria);
    }
    .optional {
      font-weight: normal;
      color: var(--quipu-tinta-secundaria);
    }
    .fields {
      display: grid;
      gap: 1.375rem;
    }
    .relationship {
      display: grid;
      gap: 0.375rem;
    }
  `,
})
export class PersonalDataFieldsComponent {
  readonly form = input.required<FieldTree<PersonalData>>();
  /** Ids of the fields start with it, so two forms on a page never share one. */
  readonly prefix = input('personal');
  /** What the screen says under «Contacto de emergencia»; O1 tells it can be left empty. */
  readonly emergencyHint = input<string | null>(null);

  protected readonly nameHelp = NAME_HELP;
  protected readonly phoneHelp = PHONE_HELP;
  protected readonly emailHelp = EMAIL_HELP;
  protected readonly emergencyHelp = EMERGENCY_NAME_HELP;
  protected readonly kinOptions = KIN_OPTIONS;

  protected readonly nameError = computed(() => firstError(this.form().name));
  protected readonly phoneError = computed(() => firstError(this.form().phone));
  protected readonly emailError = computed(() => firstError(this.form().contactEmail));
  protected readonly emergencyNameError = computed(() => firstError(this.form().emergencyName));
  protected readonly relationshipError = computed(() =>
    firstError(this.form().emergencyRelationship),
  );
  protected readonly emergencyPhoneError = computed(() => firstError(this.form().emergencyPhone));
  protected readonly relationship = computed(() => this.form().emergencyRelationship().value());

  /** A shortcut fills the free field; it does not replace it (P-19). */
  protected chooseRelationship(value: string): void {
    this.form().emergencyRelationship().value.set(value);
  }
}
