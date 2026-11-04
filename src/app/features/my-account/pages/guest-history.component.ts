import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { MatAnchor, MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { toBffErrorWithServerMessage } from '@core/http/bff-error';
import { GuestHistoryItem, GuestPaymentsService } from '../data/guest-payments.service';
import type { GuestPayment, GuestProof } from '../data/own-payments';
import {
  formatDate,
  formatDateTime,
  formatMoney,
  periodLabel,
} from '@shared/payments/payment-format';
import { PAYMENT_STATUS_LABELS } from '../model/own-payment-labels';
import { PAYMENT_PAGE_STYLES } from '@shared/payments/payment-page.styles';
import { OWN_PAYMENT_STYLES } from './own-payment.styles';

type LoadState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready' }
  | { readonly kind: 'error'; readonly message: string };

const SURPLUS_TEXTS: Readonly<Record<NonNullable<GuestPayment['surplus']>['outcome'], string>> = {
  CREDIT: 'quedó como crédito a favor',
  REFUND_PENDING: 'te lo devolveremos',
  REFUNDED: 'te lo devolvimos',
};

/**
 * H4 (CU-19, RF-10): the own payment history, newest first and paginated with the opaque cursor
 * of the BFF (RN-09: only the guest's own, without voucher URLs). A rejected payment shows its
 * reason and «Corregir pago» (H3); a pending one, «Ver pago». The refunds of Quipu come as rows
 * of their own, labelled Devuelto (RN-39).
 */
@Component({
  selector: 'app-guest-history',
  imports: [MatAnchor, MatButton, RouterLink],
  templateUrl: './guest-history.component.html',
  styles: [PAYMENT_PAGE_STYLES, OWN_PAYMENT_STYLES],
})
export class GuestHistoryComponent implements OnInit {
  private readonly payments = inject(GuestPaymentsService);

  protected readonly formatMoney = formatMoney;
  protected readonly formatDate = formatDate;
  protected readonly formatDateTime = formatDateTime;
  protected readonly statusLabels = PAYMENT_STATUS_LABELS;
  protected readonly surplusTexts = SURPLUS_TEXTS;

  protected readonly items = signal<readonly GuestHistoryItem[]>([]);
  protected readonly cursor = signal<string | null>(null);
  protected readonly creditBalance = signal(0);
  protected readonly state = signal<LoadState>({ kind: 'loading' });
  /** Whether the failed load was "Mostrar más" (the rows already shown stay). */
  protected readonly loadingMore = signal(false);
  protected readonly loadError = computed(() => {
    const state = this.state();
    return state.kind === 'error' ? state.message : '';
  });

  private destroyed = false;
  private request = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
    });
  }

  ngOnInit(): void {
    void this.load();
  }

  protected more(): void {
    const cursor = this.cursor();
    if (cursor !== null) void this.load(cursor);
  }

  protected retry(): void {
    if (this.loadingMore()) {
      this.more();
    } else {
      void this.load();
    }
  }

  protected periodOf(payment: GuestPayment): string {
    return periodLabel({
      period: payment.period,
      stayStartDate: payment.stayStartDate ?? null,
      stayEndDate: payment.stayEndDate ?? null,
    });
  }

  protected proofText(proof: GuestProof): string {
    const parts = [
      proof.kind === 'VOUCHER' ? 'Voucher' : 'Efectivo',
      proof.method ?? '',
      proof.uploadedBy === 'GUEST' ? 'enviado por ti' : 'agregado por la administración',
      `declarado ${formatMoney(proof.declaredAmount)}`,
      proof.verifiedAmount === null ? '' : `verificado ${formatMoney(proof.verifiedAmount)}`,
    ];
    return parts.filter((part) => part !== '').join(' · ');
  }

  private async load(after?: string): Promise<void> {
    const request = ++this.request;
    this.loadingMore.set(after !== undefined);
    this.state.set({ kind: 'loading' });
    try {
      const page = await firstValueFrom(this.payments.history(after));
      if (this.destroyed || request !== this.request) return;
      this.items.update((current) =>
        after === undefined ? page.content : [...current, ...page.content],
      );
      this.cursor.set(page.nextCursor);
      this.creditBalance.set(page.creditBalance);
      this.state.set({ kind: 'ready' });
    } catch (error: unknown) {
      if (this.destroyed || request !== this.request) return;
      this.state.set({ kind: 'error', message: toBffErrorWithServerMessage(error).message });
    }
  }
}
