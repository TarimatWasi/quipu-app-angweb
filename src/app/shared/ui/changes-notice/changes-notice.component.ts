import { Component, output } from '@angular/core';
import { PageNoticeComponent } from '../page-notice/page-notice.component';

/** An invalidated form keeps its draft and selected files until the person completes the action. */
@Component({
  selector: 'app-changes-notice',
  imports: [PageNoticeComponent],
  template: `<app-page-notice heading="Hay cambios en la información de esta pantalla.">
    Conservamos lo que estás editando. Puedes terminar o volver a cargar; al hacerlo se reemplazarán
    los datos del formulario.
    <button
      noticeAction
      class="quipu-button quipu-button--tertiary"
      type="button"
      (click)="reload.emit()"
    >
      Volver a cargar
    </button>
  </app-page-notice>`,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class ChangesNoticeComponent {
  readonly reload = output();
}
