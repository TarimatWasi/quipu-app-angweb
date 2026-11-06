import { Component, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { PageNoticeComponent } from '@shared/ui/page-notice/page-notice.component';
import { CsrfBootstrapService } from './csrf-bootstrap.service';

/** Recovery does not replace routed forms, lose drafts or resend their last operation. */
@Component({
  selector: 'app-csrf-status',
  imports: [PageNoticeComponent],
  template: `
    @if (csrf.error(); as message) {
      <app-page-notice tone="error" [heading]="message">
        <button
          noticeAction
          class="quipu-button quipu-button--secondary"
          type="button"
          [disabled]="csrf.pending()"
          (click)="retry()"
        >
          {{ csrf.pending() ? 'Preparando…' : 'Preparar seguridad' }}
        </button>
      </app-page-notice>
    }
  `,
  styles: ':host { display: block; } app-page-notice { margin: 1rem; }',
})
export class CsrfStatusComponent {
  protected readonly csrf = inject(CsrfBootstrapService);
  protected retry(): void {
    if (!this.csrf.pending()) void firstValueFrom(this.csrf.refresh()).catch(() => undefined);
  }
}
