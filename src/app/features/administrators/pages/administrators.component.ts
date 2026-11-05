import { Component, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { LoadErrorComponent } from '@shared/ui/load-error/load-error.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { PageNoticeComponent } from '@shared/ui/page-notice/page-notice.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { ToastComponent } from '@shared/ui/toast/toast.component';
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
    AdministratorsListComponent,
    LoadErrorComponent,
    PageHeaderComponent,
    PageNoticeComponent,
    PendingSummaryComponent,
    SkeletonComponent,
    ToastComponent,
  ],
  templateUrl: './administrators.component.html',
  styleUrl: './administrators.component.scss',
})
export class AdministratorsComponent {
  private readonly administrators = inject(AdministratorsService);
  private readonly dialog = inject(MatDialog);

  protected readonly list = this.administrators.list();
  private readonly retried = signal(false);

  protected readonly loadErrorText = LOAD_ERROR_TEXT;
  protected readonly footer = FOOTER_TEXT;
  protected readonly unsentHeading = EMAIL_NOT_SENT_HEADING;
  protected readonly toast = signal<string | null>(null);
  /** The email of an administrator just created whose link could not be sent; null otherwise. */
  protected readonly unsentEmail = signal<string | null>(null);

  private readonly loaded = computed(() =>
    this.list.hasValue() ? this.list.value() : NO_ADMINISTRATORS,
  );
  /** Only the first read shows the skeleton; «Reintentar» keeps the notice while it reads again. */
  protected readonly retrying = computed(() => this.retried() && this.list.isLoading());
  protected readonly view = computed<View>(() => {
    if (this.list.hasValue()) return 'ready';
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

  protected unsentText(email: string): string {
    return emailNotSentText(email);
  }

  protected retry(): void {
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
        this.list.reload();
        this.toast.set(texts.done);
      });
  }

  /** The toast, or the yellow notice that stays when the link could not be emailed. */
  private created({ email, emailSent }: NewAdministratorResult): void {
    this.list.reload();
    if (emailSent) {
      this.unsentEmail.set(null);
      this.toast.set(CREATED_TEXT);
    } else {
      this.toast.set(null);
      this.unsentEmail.set(email);
    }
  }
}
