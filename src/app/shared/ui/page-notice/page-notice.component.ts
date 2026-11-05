import { Component, input } from '@angular/core';

export type NoticeTone = 'info' | 'success' | 'error';

/**
 * P-09 Aviso de página: a block of its tone without border. The key phrase (`heading`) goes in
 * bold, the rest is the projected text and the action, if any, goes in `[noticeAction]`, as a link
 * or a tertiary button. Yellow informs, green confirms what just happened (as «Contraseña
 * actualizada.» in A0) and red asks to correct something and is announced at once (role=alert).
 * Only spans inside, so it may also sit inside an <output>.
 */
@Component({
  selector: 'app-page-notice',
  template: `
    @if (heading()) {
      <strong>{{ heading() }}</strong>
    }
    <span class="text"><ng-content /></span>
    <span class="action"><ng-content select="[noticeAction]" /></span>
  `,
  // Color, padding, radius and text come from the global P-09 classes (styles.scss); here only
  // how the heading, the text and the action sit in a row.
  host: {
    '[class]': '"quipu-notice quipu-notice--" + tone()',
    '[attr.role]': 'tone() === "error" ? "alert" : null',
  },
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.25rem 0.75rem;
    }
    .text:empty,
    .action:empty {
      display: none;
    }
    .action {
      --quipu-chilca: currentColor;
    }
  `,
})
export class PageNoticeComponent {
  readonly tone = input<NoticeTone>('info');
  /** The key phrase, in bold, e.g. «Tu pago no se aprobó.». */
  readonly heading = input('');
}
