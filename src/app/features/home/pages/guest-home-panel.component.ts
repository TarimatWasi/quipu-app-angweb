import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { MatAnchor, MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { toBffErrorWithServerMessage } from '@core/services/bff-error';
import {
  GuestCredit,
  GuestPaymentsService,
  PeriodStatus,
} from '@core/services/guest-payments.service';
import { creditBalanceText, creditUseText, dueBreakdownText } from '@shared/payments/credit-texts';
import {
  formatMoney,
  formatPeriod,
  hasRejectedPayment,
  PERIOD_STATUS_LABELS,
  takesNewPayment,
} from '@shared/payments/payment-format';
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

/** A month still to pay, with what is left after the credit (RN-38), as the BFF answers it. */
interface DueRow {
  readonly period: string;
  readonly label: string;
  readonly status: PeriodStatus['status'];
  readonly due: string;
  readonly breakdown: string | null;
}

function dueRow(period: PeriodStatus): DueRow {
  return {
    period: period.period,
    label: formatPeriod(period.period),
    status: period.status,
    due: `Por pagar ${formatMoney(period.amountDue)}`,
    breakdown: dueBreakdownText(period),
  };
}

const isUnpaid = ({ status }: PeriodStatus) => status === 'UNPAID' || status === 'OVERDUE';

/**
 * The payment entries of the home of a guest with a contract (H1, CU-16): the credit in favour
 * (RN-38) and what is left to pay of every unpaid month («Lo que toca ahora»), «Subir voucher» (H3),
 * «Corregir pago de …» for every month whose payment was rejected, with its reason (D-34d), and
 * «Historial de pagos» (H4). It reads only the own account status and the own credit; when the
 * credit cannot be read the home works the same, without its notice.
 */
@Component({
  selector: 'app-guest-home-panel',
  imports: [MatAnchor, MatButton, RouterLink],
  template: `
    <section class="panel" aria-labelledby="guest-payments-title">
      <h2 id="guest-payments-title">Tus pagos</h2>
      @if (creditNotice(); as notice) {
        <div class="notice" role="note" aria-label="Crédito a favor">
          <p>
            <span class="strong">{{ notice.balance }}</span> {{ notice.use }}
          </p>
        </div>
      }
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
      @if (dueRows().length > 0) {
        <section class="due" aria-labelledby="guest-due-title">
          <h3 id="guest-due-title">Lo que toca ahora</h3>
          <ul class="due-list">
            @for (row of dueRows(); track row.period) {
              <li>
                <span class="strong">{{ row.label }}</span>
                <span [class]="'badge status-' + row.status">{{ statusLabels[row.status] }}</span>
                <span>{{ row.due }}</span>
                @if (row.breakdown; as breakdown) {
                  <span class="muted">{{ breakdown }}</span>
                }
              </li>
            }
          </ul>
        </section>
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

  protected readonly statusLabels = PERIOD_STATUS_LABELS;
  protected readonly periods = signal<readonly PeriodStatus[]>([]);
  /** The own credit; null while it is read or when it could not be read. */
  protected readonly credit = signal<GuestCredit | null>(null);
  protected readonly state = signal<LoadState>({ kind: 'loading' });
  protected readonly loadError = computed(() => {
    const state = this.state();
    return state.kind === 'error' ? state.message : '';
  });
  protected readonly rejected = computed(() => this.periods().filter(hasRejectedPayment));
  protected readonly unpaid = computed(() => this.periods().filter(takesNewPayment));
  protected readonly unpaidMessage = computed(() => unpaidText(this.unpaid().length));
  /** Every unpaid month, a first payment or a rejected one, with what is left to pay. */
  protected readonly dueRows = computed(() => this.periods().filter(isUnpaid).map(dueRow));
  /** The first month without a payment comes chosen in H3. */
  protected readonly uploadQuery = computed(() => {
    const first = this.unpaid()[0];
    return first ? { period: first.period } : {};
  });
  /** «Tienes S/ … a favor.» and where it is discounted: the month the BFF discounts it from. */
  protected readonly creditNotice = computed(() => {
    const credit = this.credit();
    if (credit === null || credit.balance <= 0) return null;
    const month = this.periods().find((p) => p.status !== 'PAID' && p.creditApplied > 0);
    return {
      balance: creditBalanceText(credit.balance),
      use: creditUseText({ toRefund: credit.toRefund, month: month?.period ?? null }),
    };
  });

  private destroyed = false;
  // Move with every load, so a late answer of a previous load is ignored.
  private statusRequest = 0;
  private creditRequest = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
    });
  }

  ngOnInit(): void {
    this.load();
  }

  protected retry(): void {
    this.load();
  }

  protected monthOf(period: PeriodStatus): string {
    return formatPeriod(period.period);
  }

  private load(): void {
    void this.loadStatus();
    void this.loadCredit();
  }

  private async loadStatus(): Promise<void> {
    const request = ++this.statusRequest;
    this.state.set({ kind: 'loading' });
    try {
      const periods = await firstValueFrom(this.payments.accountStatus());
      if (this.destroyed || request !== this.statusRequest) return;
      this.periods.set(periods);
      this.state.set({ kind: 'ready' });
    } catch (error: unknown) {
      if (this.destroyed || request !== this.statusRequest) return;
      this.state.set({ kind: 'error', message: toBffErrorWithServerMessage(error).message });
    }
  }

  /** The notice is optional: any error only leaves it out (H1 works without it). */
  private async loadCredit(): Promise<void> {
    const request = ++this.creditRequest;
    try {
      const credit = await firstValueFrom(this.payments.credit());
      if (this.destroyed || request !== this.creditRequest) return;
      this.credit.set(credit);
    } catch {
      if (this.destroyed || request !== this.creditRequest) return;
      this.credit.set(null);
    }
  }
}
