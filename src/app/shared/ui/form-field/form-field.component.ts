import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input } from '@angular/core';

/**
 * P-07 Campo (TAR-297): the label, the control the screen projects, its error and its help, with
 * the ids that tie them together. The control carries `appFieldControl`, which takes from here its
 * `id`, `aria-invalid` and `aria-describedby`. `group` draws a `fieldset` with its `legend` for a
 * set of buttons (a segmented control); `money` puts «S/» before the control.
 *
 * ```html
 * <app-form-field fieldId="new-guest-phone" label="Teléfono" [help]="phoneHelp" [error]="phoneError()">
 *   <input appFieldControl class="quipu-input" type="tel" [formField]="guestForm.phone" />
 * </app-form-field>
 * ```
 */
@Component({
  selector: 'app-form-field',
  imports: [NgTemplateOutlet],
  template: `
    <ng-template #control><ng-content /></ng-template>
    <ng-template #after><ng-content select="[fieldAfter]" /></ng-template>
    @if (group()) {
      <fieldset class="quipu-field">
        <legend [class]="hiddenLabel() ? 'cdk-visually-hidden' : 'quipu-label'">
          {{ label() }}
          @if (optional()) {
            <span class="optional">(opcional)</span>
          }
        </legend>
        <ng-container [ngTemplateOutlet]="control" />
        <ng-container [ngTemplateOutlet]="messages" />
        <ng-container [ngTemplateOutlet]="after" />
      </fieldset>
    } @else {
      <div class="quipu-field">
        <label class="quipu-label" [for]="fieldId()">
          {{ label() }}
          @if (optional()) {
            <span class="optional">(opcional)</span>
          }
        </label>
        @if (money()) {
          <span class="quipu-money">
            <span aria-hidden="true">S/</span>
            <ng-container [ngTemplateOutlet]="control" />
          </span>
        } @else {
          <ng-container [ngTemplateOutlet]="control" />
        }
        <ng-container [ngTemplateOutlet]="messages" />
        <ng-container [ngTemplateOutlet]="after" />
      </div>
    }
    <ng-template #messages>
      @if (error(); as message) {
        <p class="quipu-field-error" [id]="errorId()">{{ message }}</p>
      }
      @if (help(); as text) {
        <p class="quipu-field-help" [id]="helpId()">{{ text }}</p>
      }
    </ng-template>
  `,
  styles: `
    :host {
      display: block;
    }
    .optional {
      font-weight: normal;
    }
  `,
})
export class FormFieldComponent {
  /** The id of the control; its error and help take `<id>-error` and `<id>-help`. */
  readonly fieldId = input.required<string>();
  readonly label = input.required<string>();
  /** The legend of a group is read by a screen reader only, when a heading already names it. */
  readonly hiddenLabel = input(false);
  /** Says «(opcional)» after the label. */
  readonly optional = input(false);
  readonly help = input<string | null>(null);
  /** What is wrong with the value, once the screen shows it; null while it is fine. */
  readonly error = input<string | null>(null);
  /** A set of buttons named by a `legend` instead of one control named by a `label`. */
  readonly group = input(false);
  /** An amount in soles: «S/» goes before the control (`.quipu-money`). */
  readonly money = input(false);

  readonly errorId = computed(() => `${this.fieldId()}-error`);
  readonly helpId = computed(() => `${this.fieldId()}-help`);
  /** What the control is described by: its error first, then its help. */
  readonly describedBy = computed(() => {
    const ids = [this.error() ? this.errorId() : null, this.help() ? this.helpId() : null];
    const joined = ids.filter((id): id is string => id !== null).join(' ');
    return joined === '' ? null : joined;
  });
}
