import { NowPanelComponent } from '@shared/ui/now-panel/now-panel.component';
import { SkeletonBlockComponent } from '@shared/ui/skeleton/skeleton-block.component';
import { SkeletonContentDirective } from '@shared/ui/skeleton/skeleton-content.directive';
import {
  afterRenderEffect,
  Component,
  computed,
  ElementRef,
  inject,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { LoadErrorComponent } from '@shared/ui/load-error/load-error.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { PageNoticeComponent } from '@shared/ui/page-notice/page-notice.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { openAccountChangeDialog } from '../components/account-change-dialog.component';
import { AdministratorsListComponent } from '../components/administrators-list.component';
import { openNewAdministratorDialog } from '../components/new-administrator-dialog.component';
import type { NewAdministratorResult } from '../components/new-administrator-dialog.component';
import { PendingSummaryComponent } from '../components/pending-summary.component';
import { AdministratorsService } from '../data/administrators.service';
import { countsOf, hasRoom, toRow } from '../model/administrator';
import type { AdministratorRow, AdministratorSummary } from '../model/administrator';
import {
  changeTexts,
  countLine,
  CREATED_TEXT,
  EMAIL_NOT_SENT_HEADING,
  emailNotSentText,
  FOOTER_TEXT,
  FULL_HELP_TEXT,
  LOAD_ERROR_TEXT,
  pendingSummary,
  ROOM_HELP_TEXT,
} from '../model/administrator-texts';
import { ToastService } from '@shared/ui/toast/toast.service';

type View = 'loading' | 'error' | 'ready';

const NO_ADMINISTRATORS: readonly AdministratorSummary[] = [];

/**
 * A7 «Administradores» (RF-22, RF-23, TAR-127): who administers Quipu, what is pending (accounts
 * not yet activated) and the changes: a new administrator, up to 5 active ones, and deactivating or
 * reactivating another one. Every change asks the password of the session in its dialog; once done
 * the list is read again and a toast says so.
 */
@Component({
  selector: 'app-administrators',
  imports: [
    NowPanelComponent,
    AdministratorsListComponent,
    LoadErrorComponent,
    PageHeaderComponent,
    PageNoticeComponent,
    PendingSummaryComponent,
    SkeletonComponent,
    SkeletonBlockComponent,
    SkeletonContentDirective,
  ],
  templateUrl: './administrators.component.html',
  styleUrl: './administrators.component.scss',
})
export class AdministratorsComponent {
  private readonly administrators = inject(AdministratorsService);
  private readonly dialog = inject(MatDialog);

  protected readonly list = this.administrators.list();
  private readonly retried = signal(false);
  /** Set by a creation: once the list is read again, the focus may have to leave «Nuevo». */
  private readonly checkFocus = signal(false);
  private readonly countElement = viewChild<ElementRef<HTMLElement>>('countLine');

  protected readonly loadErrorText = LOAD_ERROR_TEXT;
  protected readonly footer = FOOTER_TEXT;
  protected readonly unsentHeading = EMAIL_NOT_SENT_HEADING;
  private readonly toasts = inject(ToastService);
  /** The email of an administrator just created whose link could not be sent; null otherwise. */
  protected readonly unsentEmail = signal<string | null>(null);

  private readonly lastList = linkedSignal<
    readonly AdministratorSummary[] | undefined,
    readonly AdministratorSummary[] | undefined
  >({
    source: () => (this.list.hasValue() ? this.list.value() : undefined),
    computation: (value, previous) => value ?? previous?.value,
  });
  private readonly loaded = computed(() => this.lastList() ?? NO_ADMINISTRATORS);
  /** Only the first read shows the skeleton; «Reintentar» keeps the notice while it reads again. */
  protected readonly retrying = computed(() => this.retried() && this.list.isLoading());
  protected readonly view = computed<View>(() => {
    if (this.lastList() !== undefined) return 'ready';
    return this.list.error() !== undefined || this.retrying() ? 'error' : 'loading';
  });
  protected readonly counts = computed(() => countsOf(this.loaded()));
  protected readonly rows = computed(() => {
    const now = new Date();
    return this.loaded().map((administrator) => toRow(administrator, now));
  });
  protected readonly summary = computed(() => pendingSummary(this.counts()));
  protected readonly countText = computed(() => countLine(this.counts()));
  protected readonly full = computed(() => !hasRoom(this.counts()));
  protected readonly newHelp = computed(() => (this.full() ? FULL_HELP_TEXT : ROOM_HELP_TEXT));

  constructor() {
    // The creation that fills the 5th place disables «Nuevo administrador», where the dialog gave
    // the focus back: it goes to the count instead, which says why.
    afterRenderEffect(() => {
      if (!this.checkFocus() || this.list.isLoading()) return;
      this.checkFocus.set(false);
      if (this.full()) this.countElement()?.nativeElement.focus();
    });
  }

  protected unsentText(email: string): string {
    return emailNotSentText(email);
  }

  protected retry(): void {
    if (this.list.isLoading()) return;
    this.retried.set(true);
    this.list.reload();
  }

  protected openNew(): void {
    if (this.full()) return;
    openNewAdministratorDialog(this.dialog, {
      create: (input) => this.administrators.create(input),
    })
      .afterClosed()
      .subscribe((result) => {
        if (result) this.created(result);
      });
  }

  /** «Desactivar» or «Reactivar» of a row, with the password of the session. */
  protected change(row: AdministratorRow): void {
    const action = row.action;
    if (action === null) return;
    const texts = changeTexts(action, row.displayName);
    openAccountChangeDialog(this.dialog, {
      action,
      who: row.displayName,
      change: (currentPassword) =>
        action === 'deactivate'
          ? this.administrators.deactivate(row.id, currentPassword)
          : this.administrators.reactivate(row.id, currentPassword),
    })
      .afterClosed()
      .subscribe((done) => {
        if (done !== true) return;
        this.retried.set(false);
        this.list.reload();
        this.toasts.show(texts.done, { tone: 'success' });
      });
  }

  /** The toast, or the yellow notice that stays when the link could not be emailed. */
  private created({ email, emailSent }: NewAdministratorResult): void {
    this.retried.set(false);
    this.list.reload();
    this.checkFocus.set(true);
    if (emailSent) {
      this.unsentEmail.set(null);
      this.toasts.show(CREATED_TEXT, { tone: 'success' });
    } else {
      this.toasts.dismiss();
      this.unsentEmail.set(email);
    }
  }
}
