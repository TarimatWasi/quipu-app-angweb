import {
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import type { UrlTree } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { watchChanges } from '@core/changes/change-resources.service';
import type { ChangeKey } from '@core/changes/change-events';
import { toBffError } from '@core/http/bff-error';
import { PagedList } from '@shared/data/paged-list';
import { formatDateTime } from '@shared/payments/payment-format';
import { LoadErrorComponent } from '@shared/ui/load-error/load-error.component';
import { ShowMoreComponent } from '@shared/ui/show-more/show-more.component';
import { SkeletonBlockComponent } from '@shared/ui/skeleton/skeleton-block.component';
import { ToastService } from '@shared/ui/toast/toast.service';
import { notificationLink } from './notification-link';
import type { NotificationAudience } from './notification-link';
import { NotificationsClient } from './notifications.client';
import type { Notification, NotificationArea, PagedNotifications } from './notifications.client';

/** What the bell says when its list cannot be read. */
export const NOTIFICATIONS_LOAD_ERROR = 'No se pudieron cargar tus notificaciones.';
/** The list when there is nothing in the bell (the BFF keeps 90 days). */
export const NOTIFICATIONS_EMPTY = 'No tienes notificaciones.';

/** Where each bell reads, and its live key: both guests hear `guest.notifications`. */
const AREAS: Readonly<Record<NotificationAudience, NotificationArea>> = {
  ADMIN: 'admin',
  CONTRACT: 'guest',
  TEMPORARY: 'temporary-guest',
};
const LIVE_KEYS: Readonly<Record<NotificationAudience, ChangeKey>> = {
  ADMIN: 'admin.notifications',
  CONTRACT: 'guest.notifications',
  TEMPORARY: 'guest.notifications',
};

/** How many rows the skeleton of the list shows while its first page arrives. */
const SKELETON_ROWS = 3;

/** One row as the bell shows it: read when the BFF says so or since this tab marked it. */
interface NotificationRow {
  readonly notification: Notification;
  readonly unread: boolean;
  readonly link: UrlTree | null;
  readonly when: string;
}

/**
 * The bell of the bar (contract v0.27.0): the unread count on the button and, when open, the
 * notifications newest first with the server's own title and body (an unknown `type` shows the
 * same way), «Marcar todas como leídas» and «Mostrar más». A row with a target opens its page
 * and is marked read; one without a target is marked read when pressed. The live key
 * `admin.notifications` or `guest.notifications` (and ALL, the start of the business day) reads the first page again;
 * marking read only changes this tab, as the contract says, so the marks of this tab are kept
 * over what the server answered until the next read.
 */
@Component({
  selector: 'app-notification-bell',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    LoadErrorComponent,
    ShowMoreComponent,
    SkeletonBlockComponent,
  ],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.scss',
  host: {
    '(document:keydown.escape)': 'closeWithEscape()',
    '(document:click)': 'closeWhenOutside($event)',
  },
})
export class NotificationBellComponent {
  readonly audience = input.required<NotificationAudience>();

  private readonly client = inject(NotificationsClient);
  private readonly toasts = inject(ToastService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly button = viewChild<ElementRef<HTMLButtonElement>>('bellButton');

  protected readonly area = computed<NotificationArea>(() => AREAS[this.audience()]);
  private readonly serverUnread = signal(0);
  /** Ids this tab marked read, and whether it marked every one, since the last first page. */
  private readonly readHere = signal<ReadonlySet<string>>(new Set());
  private readonly allReadHere = signal(false);

  protected readonly list = new PagedList<NotificationArea, Notification, PagedNotifications>(
    (area, after) => this.client.page(area, after),
    (page, request) => {
      this.serverUnread.set(page.unreadCount);
      if (request.after === null) {
        this.readHere.set(new Set());
        this.allReadHere.set(false);
      }
    },
  );

  protected readonly open = signal(false);
  protected readonly skeletonRows = Array.from({ length: SKELETON_ROWS }, (_, index) => index);
  protected readonly loadError = NOTIFICATIONS_LOAD_ERROR;
  protected readonly empty = NOTIFICATIONS_EMPTY;

  protected readonly rows = computed<readonly NotificationRow[]>(() => {
    const readHere = this.readHere();
    const allRead = this.allReadHere();
    return this.list.items().map((notification) => ({
      notification,
      unread: notification.readAt === null && !allRead && !readHere.has(notification.id),
      link: this.linkTo(notificationLink(this.audience(), notification.target)),
      when: formatDateTime(notification.createdAt),
    }));
  });

  protected readonly unreadCount = computed(() => {
    if (this.allReadHere()) return 0;
    const markedHere = this.list
      .items()
      .filter((item) => item.readAt === null && this.readHere().has(item.id)).length;
    return Math.max(this.serverUnread() - markedHere, 0);
  });

  protected readonly badge = computed(() => {
    const count = this.unreadCount();
    return count > 9 ? '9+' : String(count);
  });

  protected readonly buttonLabel = computed(() => {
    const count = this.unreadCount();
    if (count === 0) return 'Notificaciones';
    return count === 1 ? 'Notificaciones, 1 sin leer' : `Notificaciones, ${String(count)} sin leer`;
  });

  protected readonly watching = watchChanges({
    keys: () => [LIVE_KEYS[this.audience()]],
    reload: () => {
      this.list.reload(this.area());
    },
    busy: () => this.list.loading(),
  });

  /** The first page of the bell's inbox, read again if the audience of the bar changes. */
  protected readonly firstRead = effect(() => {
    const area = this.area();
    untracked(() => {
      this.list.switchTo(area);
    });
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.list.dispose();
    });
  }

  /** A link may carry a query (`?document=`): parsed, so the router keeps it as one. */
  private linkTo(url: string | null): UrlTree | null {
    return url === null ? null : this.router.parseUrl(url);
  }

  protected toggle(): void {
    this.open.update((open) => !open);
  }

  protected more(): void {
    this.list.more(this.area());
  }

  protected retry(): void {
    this.list.retry(this.area());
  }

  /** A row was pressed: it is read from now on in this tab; its page, if any, opens. */
  protected choose(row: NotificationRow): void {
    if (row.link !== null) this.open.set(false);
    if (!row.unread) return;
    const id = row.notification.id;
    this.readHere.update((ids) => new Set([...ids, id]));
    firstValueFrom(this.client.read(this.area(), id)).catch((error: unknown) => {
      this.readHere.update((ids) => new Set([...ids].filter((item) => item !== id)));
      this.toasts.show(toBffError(error).message);
    });
  }

  protected readAll(): void {
    this.allReadHere.set(true);
    firstValueFrom(this.client.readAll(this.area())).catch((error: unknown) => {
      this.allReadHere.set(false);
      this.toasts.show(toBffError(error).message);
    });
  }

  protected closeWithEscape(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.button()?.nativeElement.focus();
  }

  protected closeWhenOutside(event: MouseEvent): void {
    const target = event.target;
    if (this.open() && target instanceof Node && !this.host.nativeElement.contains(target)) {
      this.open.set(false);
    }
  }
}
