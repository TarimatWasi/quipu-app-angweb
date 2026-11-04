import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { MatAnchor, MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { toBffErrorWithServerMessage } from '@core/services/bff-error';
import {
  StayPaymentStatus,
  TemporaryGuestPaymentsService,
} from '@core/services/temporary-guest-payments.service';
import { surplusText } from '@shared/payments/credit-texts';
import {
  formatStay,
  hasRejectedPayment,
  PERIOD_STATUS_LABELS,
  takesNewPayment,
} from '@shared/payments/payment-format';
import { HOME_PANEL_STYLES } from './home-panel.styles';

type LoadState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready' }
  | { readonly kind: 'no-stay'; readonly message: string }
  | { readonly kind: 'error'; readonly message: string };

/**
 * The payment entry of the home of a temporary guest (T1, CU-21): the state of the stay in force
 * (otherwise the next one, otherwise the last one) and the way to T2: «Subir pago» when it is not
 * paid, «Corregir pago» with the reason when its payment was rejected, «Ver pago» while it waits.
 * What was paid over the agreed amount is refunded, never kept as credit: a notice says whether the
 * refund is pending or was made, with its method and date (RN-38, RN-39).
 */
@Component({
  selector: 'app-temporary-home-panel',
  imports: [MatAnchor, MatButton, RouterLink],
  template: `
    <section class="panel" aria-labelledby="stay-payment-title">
      <h2 id="stay-payment-title">Tu pago</h2>
      @switch (state().kind) {
        @case ('loading') {
          <output class="muted">Cargando el estado de tu pago…</output>
        }
        @case ('no-stay') {
          <p>{{ noStayMessage() }}</p>
        }
        @case ('error') {
          <div class="quipu-alert" role="alert">
            <p>{{ loadError() }}</p>
            <button mat-stroked-button type="button" (click)="retry()">Reintentar</button>
          </div>
        }
      }
      @if (stay(); as s) {
        <p>
          <span class="strong">Estadía {{ stayLabel() }}</span>
          <span [class]="'badge status-' + s.status">{{ statusLabels[s.status] }}</span>
        </p>
        @if (refundNotice(); as notice) {
          <div class="notice" role="note" aria-label="Devolución">
            <p>{{ notice }}</p>
          </div>
        }
        @if (rejected() && s.paymentId; as id) {
          <div class="quipu-alert">
            <p class="strong">Tu pago no se aprobó</p>
            @if (s.rejectionReason; as reason) {
              <p>{{ reason }}</p>
            }
            <a mat-stroked-button [routerLink]="['/temporary-guest/payment', id]">Corregir pago</a>
          </div>
        } @else if (takesPayment()) {
          <div class="actions">
            <a mat-flat-button routerLink="/temporary-guest/payment">Subir pago</a>
          </div>
        } @else if (s.status === 'UNDER_REVIEW' && s.paymentId; as id) {
          <div class="actions">
            <a mat-button [routerLink]="['/temporary-guest/payment', id]">Ver pago</a>
          </div>
        }
      }
    </section>
  `,
  styles: HOME_PANEL_STYLES,
})
export class TemporaryHomePanelComponent implements OnInit {
  private readonly payments = inject(TemporaryGuestPaymentsService);

  protected readonly statusLabels = PERIOD_STATUS_LABELS;
  protected readonly stay = signal<StayPaymentStatus | null>(null);
  protected readonly state = signal<LoadState>({ kind: 'loading' });
  protected readonly loadError = computed(() => {
    const state = this.state();
    return state.kind === 'error' ? state.message : '';
  });
  protected readonly noStayMessage = computed(() => {
    const state = this.state();
    return state.kind === 'no-stay' ? state.message : '';
  });
  protected readonly stayLabel = computed(() => {
    const stay = this.stay();
    return stay ? formatStay(stay.startDate, stay.endDate) : '';
  });
  protected readonly refundNotice = computed(() => {
    const surplus = this.stay()?.surplus;
    return surplus && surplus.amount > 0 ? surplusText(surplus) : null;
  });
  protected readonly rejected = computed(() => {
    const stay = this.stay();
    return stay !== null && hasRejectedPayment(stay);
  });
  protected readonly takesPayment = computed(() => {
    const stay = this.stay();
    return stay !== null && takesNewPayment(stay);
  });

  private destroyed = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
    });
  }

  ngOnInit(): void {
    void this.load();
  }

  protected retry(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    this.state.set({ kind: 'loading' });
    try {
      const stay = await firstValueFrom(this.payments.paymentStatus());
      if (this.destroyed) return;
      this.stay.set(stay);
      this.state.set({ kind: 'ready' });
    } catch (error: unknown) {
      if (this.destroyed) return;
      const { message } = toBffErrorWithServerMessage(error);
      // The guest has no stay yet (RESOURCE_NOT_FOUND): the BFF's own text says so.
      const noStay = error instanceof HttpErrorResponse && error.status === 404;
      this.state.set({ kind: noStay ? 'no-stay' : 'error', message });
    }
  }
}
