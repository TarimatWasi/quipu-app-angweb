import { Clipboard } from '@angular/cdk/clipboard';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FactTileComponent } from '@shared/ui/fact-tile/fact-tile.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { PageNoticeComponent } from '@shared/ui/page-notice/page-notice.component';
import { AccessHandoffService, GENERATE_ACCESS_STATE } from '../data/access-handoff.service';
import type { AccessHandoff } from '../data/access-handoff.service';
import {
  ACCESS_TEXTS,
  accessSecret,
  COPY_FAILED_TEXT,
  countdownAnnouncement,
  countdownText,
  emailNotice,
  EXPIRED_CONTEXT_TEXT,
  HIDDEN_PASSWORD,
  limaTime,
  MESSAGE_COPIED_TEXT,
  remainingMs,
  shareContext,
  whatsappUrl,
} from '../model/access';
import { documentText, GUEST_TYPE_LABELS } from '../model/guest-texts';
import { ACCESS_MODE_LABELS } from '../model/new-guest';
import type { Fact } from '../model/new-guest';
import { SUMMARY_LAYOUT_STYLES } from './summary-layout.styles';
import { ACCESS_STYLES } from './access.styles';
import { ToastService } from '@shared/ui/toast/toast.service';

const TICK_MS = 1000;

/**
 * A3.7 «Acceso generado» (RN-32) on the canvas «Acceso»: the access just generated, shown once.
 * It comes from {@link AccessHandoffService}, which forgets it as soon as it is read: the address
 * carries only the guest id, so a reload or a later visit shows that there is nothing to show
 * (FE-ANG-SEC-02). The countdown follows `expiresAt` and the clock; screen readers hear it only at
 * a few marks. «Generar otro acceso» goes to the guest's page and opens A3.4 there.
 */
@Component({
  selector: 'app-access',
  imports: [FactTileComponent, PageHeaderComponent, PageNoticeComponent, RouterLink],
  templateUrl: './access.component.html',
  styles: [SUMMARY_LAYOUT_STYLES, ACCESS_STYLES],
})
export class AccessComponent {
  private readonly clipboard = inject(Clipboard);

  protected readonly guestId = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
  /** Taken once: from here on the access lives only in this page, and goes with it. */
  protected readonly handoff: AccessHandoff | null = inject(AccessHandoffService).take(
    this.guestId,
  );

  private readonly now = signal(Date.now());
  protected readonly revealed = signal(false);
  private readonly toasts = inject(ToastService);

  protected readonly guestLink = ['/admin/guests', this.guestId];
  /** «Generar otro acceso» opens A3.4 on the guest's page, told by the navigation state only. */
  protected readonly generateState = { [GENERATE_ACCESS_STATE]: true };
  protected readonly regenerated = this.handoff?.regenerated ?? false;
  protected readonly heading = this.regenerated ? 'Acceso nuevo generado' : 'Acceso generado';
  protected readonly backLink = this.regenerated ? this.guestLink : '/admin/guests';
  /** P-02 says «Volver a …»: back to the guest it is named by its document, as A3.5 does. */
  protected readonly backTo =
    this.regenerated && this.handoff ? documentText({ ...this.handoff, name: null }) : 'Huéspedes';
  protected readonly hiddenPassword = HIDDEN_PASSWORD;
  protected readonly expiredContext = EXPIRED_CONTEXT_TEXT;

  protected readonly remaining = computed(() =>
    this.handoff ? remainingMs(this.handoff.access.expiresAt, this.now()) : 0,
  );
  protected readonly expired = computed(() => this.remaining() <= 0);
  protected readonly countdown = computed(() => countdownText(this.remaining()));
  protected readonly announcement = computed(() => countdownAnnouncement(this.remaining()));
  protected readonly facts = computed(() => (this.handoff ? this.factsOf(this.handoff) : []));
  protected readonly texts = this.handoff ? ACCESS_TEXTS[this.handoff.access.mode] : null;
  protected readonly secret = this.handoff ? accessSecret(this.handoff.access) : '';
  protected readonly shareText = this.handoff ? shareContext(this.handoff.phone) : '';
  /**
   * The message as the page shows it: a temporary password stays hidden in it too until «Mostrar
   * clave». Copying it and WhatsApp always use the whole message.
   */
  protected readonly messagePreview = computed(() => {
    const access = this.handoff?.access;
    if (!access) return '';
    return access.mode === 'TEMPORARY_PASSWORD' &&
      access.temporaryPassword !== '' &&
      !this.revealed()
      ? access.shareMessage.split(access.temporaryPassword).join(HIDDEN_PASSWORD)
      : access.shareMessage;
  });
  protected readonly whatsapp = this.handoff?.phone
    ? whatsappUrl(this.handoff.phone, this.handoff.access.shareMessage)
    : null;
  protected readonly email = this.handoff
    ? emailNotice(this.handoff.contactEmail, this.handoff.access.emailSent)
    : null;

  constructor() {
    if (this.handoff === null || this.expired()) return;
    const timer = setInterval(() => {
      this.now.set(Date.now());
      if (this.expired()) clearInterval(timer);
    }, TICK_MS);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
    });
  }

  protected toggleReveal(): void {
    this.revealed.update((shown) => !shown);
  }

  protected copySecret(): void {
    if (this.texts) this.copy(this.secret, this.texts.copiedText);
  }

  protected copyMessage(): void {
    if (this.handoff) this.copy(this.handoff.access.shareMessage, MESSAGE_COPIED_TEXT);
  }

  /** Copies with the browser's clipboard (CDK) and says so in the toast; the text is never logged. */
  private copy(text: string, done: string): void {
    const copied = this.clipboard.copy(text);
    this.toasts.show(copied ? done : COPY_FAILED_TEXT, { tone: copied ? 'success' : null });
  }

  private factsOf(handoff: AccessHandoff): readonly Fact[] {
    const time = limaTime(handoff.access.expiresAt) ?? '—';
    return [
      { label: 'Huésped', value: documentText({ ...handoff, name: null }), wide: true },
      { label: 'Tipo', value: GUEST_TYPE_LABELS[handoff.type], wide: false },
      { label: 'Entra con', value: ACCESS_MODE_LABELS[handoff.access.mode], wide: false },
      { label: this.expired() ? 'Venció a las' : 'Vence a las', value: time, wide: true },
    ];
  }
}
