import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { MatAnchor, MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { toBffErrorWithServerMessage } from '@core/services/bff-error';
import { GuestPaymentsService, PeriodStatus } from '@core/services/guest-payments.service';
import { formatPeriod, hasRejectedPayment, takesNewPayment } from '@shared/payments/payment-format';
import { HOME_PANEL_STYLES } from './home-panel.styles';

type LoadState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready' }
  | { readonly kind: 'error'; readonly message: string };

/** H1 in the SRS: «Tienes N períodos sin pagar. Sube tu voucher para que lo revisemos.» */
export function unpaidText(count: number): string {
  const periods = count === 1 ? '1 período' : `${String(count)} períodos`;
  return `Tienes ${periods} sin pagar. Sube tu voucher para que lo revisemos.`;
}

/**
 * The payment entries of the home of a guest with a contract (H1, CU-16): «Subir voucher» (H3),
 * «Corregir pago de …» for every month whose payment was rejected, with its reason (D-34d), and
 * «Historial de pagos» (H4). It reads only the own account status.
 */
@Component({
  selector: 'app-guest-home-panel',
  imports: [MatAnchor, MatButton, RouterLink],
  template: `
    <section class="panel" aria-labelledby="guest-payments-title">
      <h2 id="guest-payments-title">Tus pagos</h2>
      @switch (state().kind) {
        @case ('loading') {
          <output class="muted">Cargando tu estado de cuenta…</output>
        }
        @case ('error') {
          <div class="quipu-alert" role="alert">
            <p>{{ loadError() }}</p>
            <button mat-stroked-button type="button" (click)="retry()">Reintentar</button>
          </div>
        }
      }
      @for (rejected of rejected(); track rejected.paymentId) {
        <div class="quipu-alert">
          <p class="strong">Tu pago no se aprobó</p>
          @if (rejected.rejectionReason; as reason) {
            <p>{{ reason }}</p>
          }
          <a mat-stroked-button [routerLink]="['/guest/payments', rejected.paymentId]"
            >Corregir pago de {{ monthOf(rejected) }}</a
          >
        </div>
      }
      @if (unpaid().length > 0) {
        <p>{{ unpaidMessage() }}</p>
      }
      <div class="actions">
        <a mat-flat-button routerLink="/guest/payments/new" [queryParams]="uploadQuery()"
          >Subir voucher</a
        >
        <a mat-button routerLink="/guest/payments">Historial de pagos</a>
      </div>
    </section>
  `,
  styles: HOME_PANEL_STYLES,
})
export class GuestHomePanelComponent implements OnInit {
  private readonly payments = inject(GuestPaymentsService);

  protected readonly periods = signal<readonly PeriodStatus[]>([]);
  protected readonly state = signal<LoadState>({ kind: 'loading' });
  protected readonly loadError = computed(() => {
    const state = this.state();
    return state.kind === 'error' ? state.message : '';
  });
  protected readonly rejected = computed(() => this.periods().filter(hasRejectedPayment));
  protected readonly unpaid = computed(() => this.periods().filter(takesNewPayment));
  protected readonly unpaidMessage = computed(() => unpaidText(this.unpaid().length));
  /** The first month without a payment comes chosen in H3. */
  protected readonly uploadQuery = computed(() => {
    const first = this.unpaid()[0];
    return first ? { period: first.period } : {};
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

  protected monthOf(period: PeriodStatus): string {
    return formatPeriod(period.period);
  }

  private async load(): Promise<void> {
    this.state.set({ kind: 'loading' });
    try {
      const periods = await firstValueFrom(this.payments.accountStatus());
      if (this.destroyed) return;
      this.periods.set(periods);
      this.state.set({ kind: 'ready' });
    } catch (error: unknown) {
      if (this.destroyed) return;
      this.state.set({ kind: 'error', message: toBffErrorWithServerMessage(error).message });
    }
  }
}
