import { Component, input, output } from '@angular/core';
import { PageNoticeComponent } from '@shared/ui/page-notice/page-notice.component';

/**
 * P-12 Error de carga: the red notice (P-09, role=alert) with «Reintentar», where the content
 * would be; the bar and the title of the screen stay. While `retrying`, the button says
 * «Cargando…» and cannot be pressed again.
 */
@Component({
  selector: 'app-load-error',
  imports: [PageNoticeComponent],
  template: `
    <app-page-notice tone="error" [heading]="message()">
      <button
        noticeAction
        class="quipu-button quipu-button--tertiary"
        type="button"
        [disabled]="retrying()"
        (click)="retry.emit()"
      >
        {{ retrying() ? 'Cargando…' : 'Reintentar' }}
      </button>
    </app-page-notice>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class LoadErrorComponent {
  /** E.g. «No se pudo cargar tu estado de cuenta.». */
  readonly message = input.required<string>();
  readonly retrying = input(false);
  readonly retry = output();
}
