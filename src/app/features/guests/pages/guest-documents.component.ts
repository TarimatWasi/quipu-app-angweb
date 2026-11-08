import { RefreshErrorComponent } from '@shared/ui/refresh-error/refresh-error.component';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin } from 'rxjs';
import { AdminGuestDocumentsService } from '@core/api/clients/admin-guest-documents.service';
import { AdminGuestsService } from '@core/api/clients/admin-guests.service';
import type { GuestDetail } from '@core/api/clients/admin-guests.service';
import { AsyncContentState } from '@shared/data/async-content';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { FactTileComponent } from '@shared/ui/fact-tile/fact-tile.component';
import { LoadErrorComponent } from '@shared/ui/load-error/load-error.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { SkeletonCardsComponent } from '@shared/ui/skeleton/skeleton-cards.component';
import { SkeletonContentDirective } from '@shared/ui/skeleton/skeleton-content.directive';
import { SkeletonFactsComponent } from '@shared/ui/skeleton/skeleton-facts.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { ToastService } from '@shared/ui/toast/toast.service';
import { openDocumentActionDialog } from '../components/document-action-dialog.component';
import { DocumentActionsListComponent } from '../components/document-actions-list.component';
import { GuestDocumentsListComponent } from '../components/guest-documents-list.component';
import type { OpenRequest } from '../components/guest-documents-list.component';
import { limaDay } from '../model/guest-list-texts';
import {
  DOCUMENT_DELETED_TEXT,
  DOCUMENT_REPLACED_TEXT,
  DOCUMENTS_TITLE,
  DOCUMENTS_WHO_NOTE,
  isLinkExpired,
  LINK_EXPIRED_TEXT,
  LOAD_DOCUMENTS_TEXT,
  MAX_DOCUMENTS,
  toActionRow,
  toDocumentRow,
} from '../model/documents';
import type { ActionKind, ActionRow, DocumentRow } from '../model/documents';
import { guestName as personName } from '@shared/text/guest-text';
import { documentText, guestName } from '../model/guest-texts';
import { GUEST_DOCUMENTS_STYLES } from './guest-documents.styles';

interface DocumentsData {
  readonly guest: GuestDetail;
  readonly documents: readonly DocumentRow[];
  readonly actions: readonly ActionRow[];
}

interface Fact {
  readonly label: string;
  readonly value: string;
  readonly wide: boolean;
}

/** The three tiles of «De quién son»: the guest, its document and how many files it has. */
function facts(guest: GuestDetail, count: number): Fact[] {
  return [
    // The name, or «Huésped sin nombre» while it has none (TAR-333): its document has its own tile.
    { label: 'Huésped', value: personName(guest.name), wide: true },
    { label: 'Documento', value: documentText(guest), wide: false },
    { label: 'Archivos', value: `${String(count)} de ${String(MAX_DOCUMENTS)}`, wide: false },
  ];
}

/**
 * A3.8 «Documentos del huésped» (CU-27, CU-29, RN-37) on the canvas «Documentos»: the files the
 * guest uploaded, opened with a link of 15 minutes, and, only on an ARCO request or an upload
 * error, replaced or deleted with evidence that stays listed below. Ids are opaque.
 */
@Component({
  selector: 'app-guest-documents',
  imports: [
    RefreshErrorComponent,
    DocumentActionsListComponent,
    EmptyStateComponent,
    FactTileComponent,
    GuestDocumentsListComponent,
    LoadErrorComponent,
    PageHeaderComponent,
    RouterLink,
    SkeletonCardsComponent,
    SkeletonComponent,
    SkeletonContentDirective,
    SkeletonFactsComponent,
  ],
  templateUrl: './guest-documents.component.html',
  styles: GUEST_DOCUMENTS_STYLES,
})
export class GuestDocumentsComponent implements OnInit {
  private readonly guests = inject(AdminGuestsService);
  private readonly documents = inject(AdminGuestDocumentsService);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly toasts = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly title = DOCUMENTS_TITLE;
  protected readonly whoNote = DOCUMENTS_WHO_NOTE;
  protected readonly loadErrorText = LOAD_DOCUMENTS_TEXT;

  private readonly loaded = new AsyncContentState<DocumentsData>();
  protected readonly view = this.loaded.state;
  protected readonly notFound = signal(false);
  protected readonly retrying = this.loaded.retrying;
  protected readonly refreshing = this.loaded.refreshing;
  protected readonly refreshError = this.loaded.refreshError;
  protected readonly content = computed(() => {
    const data = this.loaded.data();
    return data === null
      ? null
      : {
          documents: data.documents,
          actions: data.actions,
          facts: facts(data.guest, data.documents.length),
        };
  });
  protected readonly backLink = computed(() => ['/admin/guests', this.currentId()]);
  protected readonly backTo = computed(() => {
    const data = this.loaded.data();
    return data === null ? 'el huésped' : guestName(data.guest);
  });

  private readonly currentId = signal('');
  private readonly dialogs = new Set<MatDialogRef<unknown, unknown>>();

  constructor() {
    this.destroyRef.onDestroy(() => {
      // Leaving the screen: no late answer may load or open a dialog any more.
      this.loaded.dispose();
      this.closeDialogs();
    });
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('id') ?? '';
      // The dialogs of the guest left behind go with it.
      if (id !== this.currentId()) this.closeDialogs();
      this.currentId.set(id);
      void this.load(true);
    });
  }

  protected reload(): void {
    void this.load(false);
  }

  /** «Abrir» with a link that already expired: it asks for a new one instead of a dead page. */
  protected open({ row, event }: OpenRequest): void {
    if (!isLinkExpired(row, new Date())) return;
    event.preventDefault();
    this.toasts.show(LINK_EXPIRED_TEXT);
    void this.load(false);
  }

  protected act(kind: ActionKind, row: DocumentRow): void {
    const guestId = this.currentId();
    if (this.refreshing()) return;
    const ref = openDocumentActionDialog(this.dialog, {
      kind,
      name: row.name,
      today: limaDay(new Date().toISOString()) ?? '',
      run: ({ request, file }) =>
        kind === 'replace' && file !== null
          ? this.documents.replace(guestId, row.id, file, request)
          : this.documents.delete(guestId, row.id, request),
    });
    this.dialogs.add(ref);
    ref.afterClosed().subscribe((done) => {
      this.dialogs.delete(ref);
      if (done !== true || guestId !== this.currentId()) return;
      this.toasts.show(kind === 'delete' ? DOCUMENT_DELETED_TEXT : DOCUMENT_REPLACED_TEXT, {
        tone: 'success',
      });
      void this.load(false);
    });
  }

  private closeDialogs(): void {
    for (const ref of this.dialogs) ref.close();
    this.dialogs.clear();
  }

  /** `fresh` starts a new initial load (another guest); otherwise the data stays while it loads. */
  private async load(fresh: boolean): Promise<void> {
    const id = this.currentId();
    const request = this.loaded.begin(fresh);
    if (request === null) return;
    if (fresh) this.notFound.set(false);
    try {
      const { guest, documents, actions } = await firstValueFrom(
        forkJoin({
          guest: this.guests.get(id),
          documents: this.documents.list(id),
          actions: this.documents.allActions(id),
        }),
      );
      const now = new Date();
      this.loaded.succeed(request, {
        guest,
        documents: documents.map((document) => toDocumentRow(document, now)),
        actions: actions.map((action) => toActionRow(action, now)),
      });
    } catch (error: unknown) {
      const missing = error instanceof HttpErrorResponse && error.status === 404;
      if (this.loaded.fail(request, LOAD_DOCUMENTS_TEXT)) this.notFound.set(missing);
    }
  }
}
