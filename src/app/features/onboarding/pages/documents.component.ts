import { Component, computed, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { callFailure } from '@shared/forms/call-failure';
import { INVALID_FILE_TEXT, isValidVoucher } from '@shared/payments/proof-rules';
import { fileMeta, limitText, toDocumentRows, uploadProblem } from '@shared/text/file-text';
import { FileFieldComponent } from '@shared/ui/file-field/file-field.component';
import { LoadErrorComponent } from '@shared/ui/load-error/load-error.component';
import { PageNoticeComponent } from '@shared/ui/page-notice/page-notice.component';
import { SkeletonBlockComponent } from '@shared/ui/skeleton/skeleton-block.component';
import { SkeletonContentDirective } from '@shared/ui/skeleton/skeleton-content.directive';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import type { OnboardingDocument } from '../data/onboarding.service';
import { OnboardingFrameComponent } from '../components/onboarding-frame.component';
import {
  DOCUMENT_FIELD_LABEL,
  DOCUMENT_RULES_NOTE,
  DOCUMENTS_AFTER,
  DOCUMENTS_LIMIT,
  documentsButton,
  documentsCount,
  documentsPrompt,
  stepProblem,
} from '../model/onboarding';
import { OnboardingPage } from './onboarding-page';
import { ONBOARDING_STYLES } from './onboarding.styles';

/** A file the guest chose and has not sent yet; the BFF refuses to delete what it already has (RN-37). */
interface QueuedFile {
  readonly id: number;
  readonly file: File;
  /** What is wrong with it: its type or size before sending, or what the BFF refused. */
  readonly error: string | null;
  readonly sending: boolean;
}

/**
 * O2 «Tus documentos» (CU-25, RN-37, RF-15) on the canvas «OnbDocumentos»: optional. The guest cannot
 * delete or change what it uploads, so it chooses first (with «Quitar») and sends on «Subir y
 * continuar», one file per call. If one fails the others stay uploaded and that one is marked.
 * Continuing, with files or without, goes to O3.
 */
@Component({
  selector: 'app-onboarding-documents',
  imports: [
    FileFieldComponent,
    LoadErrorComponent,
    OnboardingFrameComponent,
    PageNoticeComponent,
    SkeletonBlockComponent,
    SkeletonComponent,
    SkeletonContentDirective,
  ],
  templateUrl: './documents.component.html',
  styles: ONBOARDING_STYLES,
})
export class OnboardingDocumentsComponent extends OnboardingPage {
  protected readonly fieldLabel = DOCUMENT_FIELD_LABEL;
  protected readonly rulesNote = DOCUMENT_RULES_NOTE;
  protected readonly after = DOCUMENTS_AFTER;
  protected readonly fullText = limitText(DOCUMENTS_LIMIT);

  private nextId = 0;
  protected readonly queue = signal<readonly QueuedFile[]>([]);
  private readonly added = signal<readonly OnboardingDocument[]>([]);
  /** The whole send is going on: nothing can be chosen, removed or sent again until it ends. */
  protected readonly sending = signal(false);
  protected readonly problem = signal<string | null>(null);

  /** What the BFF already has: what the page read plus what this visit uploaded. */
  protected readonly uploaded = computed(() =>
    toDocumentRows([...(this.loaded.data()?.documents ?? []), ...this.added()], new Date()),
  );
  protected readonly total = computed(() => this.uploaded().length + this.queue().length);
  protected readonly full = computed(() => this.uploaded().length >= DOCUMENTS_LIMIT);
  protected readonly canAdd = computed(() => this.total() < DOCUMENTS_LIMIT);
  protected readonly count = computed(() => documentsCount(this.total()));
  protected readonly prompt = computed(() => documentsPrompt(this.total()));
  protected readonly buttonLabel = computed(() => {
    const queue = this.queue();
    const position = queue.findIndex((item) => item.sending) + 1;
    return documentsButton(this.uploaded().length, queue.length, position);
  });
  /** Skipping is offered while nothing has been uploaded and something is waiting to be. */
  protected readonly canSkip = computed(
    () => this.uploaded().length === 0 && this.queue().length > 0 && !this.sending(),
  );
  protected readonly rows = computed(() =>
    this.queue().map((item) => ({
      ...item,
      name: item.file.name,
      meta: fileMeta(item.file.type, item.file.size),
    })),
  );

  constructor() {
    super('DOCUMENTS');
  }

  protected pick(file: File | null): void {
    if (file === null || !this.canAdd() || this.sending()) return;
    const error = isValidVoucher(file) ? null : INVALID_FILE_TEXT;
    this.queue.update((queue) => [...queue, { id: ++this.nextId, file, error, sending: false }]);
  }

  protected remove(id: number): void {
    this.queue.update((queue) => queue.filter((item) => item.id !== id));
  }

  protected async submit(): Promise<void> {
    if (this.sending()) return;
    this.problem.set(null);
    this.sending.set(true);
    try {
      if (await this.uploadAll()) await this.finish();
    } finally {
      this.sending.set(false);
    }
  }

  /** «Omitir este paso»: what was chosen is not sent. */
  protected async skip(): Promise<void> {
    if (this.sending()) return;
    this.problem.set(null);
    this.queue.set([]);
    this.sending.set(true);
    try {
      await this.finish();
    } finally {
      this.sending.set(false);
    }
  }

  /** Sends the waiting files one by one; true when none is left (so the step can be finished). */
  private async uploadAll(): Promise<boolean> {
    for (const item of this.queue()) {
      if (item.error !== null) continue;
      this.mark(item.id, { sending: true });
      try {
        const document = await firstValueFrom(this.api.uploadDocument(item.file));
        this.added.update((added) => [...added, document]);
        this.remove(item.id);
      } catch (error: unknown) {
        const failure = callFailure(error);
        if (this.handled(failure)) return false;
        const found = uploadProblem(failure, DOCUMENTS_LIMIT);
        if (found.place === 'file') {
          this.mark(item.id, { sending: false, error: found.message });
        } else {
          this.mark(item.id, { sending: false });
          this.problem.set(found.message);
          return false;
        }
      }
    }
    return this.queue().length === 0;
  }

  private async finish(): Promise<void> {
    try {
      const next = await firstValueFrom(this.api.finishDocuments());
      await this.go(next.nextStep);
    } catch (error: unknown) {
      const failure = callFailure(error);
      if (!this.handled(failure)) this.problem.set(stepProblem(failure));
    }
  }

  private mark(id: number, changes: Partial<Pick<QueuedFile, 'sending' | 'error'>>): void {
    this.queue.update((queue) =>
      queue.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );
  }
}
