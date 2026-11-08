import { NgTemplateOutlet } from '@angular/common';
import { EmblemComponent } from '@shared/ui/emblem/emblem.component';
import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, firstValueFrom, map } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { ToastComponent } from '@shared/ui/toast/toast.component';
import { toBffError } from '@core/http/bff-error';
import { accountEntriesFor, isCurrent, NavEntry, roleLabelFor, sectionsFor } from './app-nav';
import { CHANGE_PASSWORD_ACTION } from '@shared/ui/account-actions/change-password-action';
import type { ChangePasswordAction } from '@shared/ui/account-actions/change-password-action';
import { ToastService } from '@shared/ui/toast/toast.service';

/**
 * Key of the route data that tells the shell its pages belong to no section (A0.7, a page that
 * does not exist): the menu marks none, even when the address starts like one.
 */
export const NO_CURRENT_SECTION = 'noCurrentSection';

/** The toast (P-17) once the password changed in A0.6. */
export const PASSWORD_CHANGED_TEXT = 'Contraseña cambiada.';

/**
 * Frame of the pages behind the login (QP-ANGWEB-ORG-01), the bar P-01: the emblem and «Quipu», the
 * menu of the role with its current section underlined in q'olle, and the account menu (Cambiar
 * contraseña, which opens its dialog; Administradores for the administrator; Salir); under it the
 * 20 px band, then the page's single main landmark. On a phone the menu and the account go into a
 * panel behind «Menú». A session without sections (onboarding) only has «Salir»; without a session
 * (A0.7, a page that does not exist) the bar has only the emblem and «Quipu».
 */
/** The action the pages of the shell use to open A0.6; a changed password is told with a toast. */
function changePasswordAction(): ChangePasswordAction {
  const injector = inject(Injector);
  const toasts = inject(ToastService);
  return async (restoreFocus) => {
    const { openChangePasswordFromInjector } =
      await import('@layout/account/change-password-dialog.component');
    openChangePasswordFromInjector(injector, restoreFocus ?? true)
      .afterClosed()
      .subscribe((changed) => {
        if (changed === true) toasts.show(PASSWORD_CHANGED_TEXT, { tone: 'success' });
      });
  };
}

@Component({
  selector: 'app-shell',
  imports: [EmblemComponent, NgTemplateOutlet, RouterLink, RouterOutlet, ToastComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
  providers: [{ provide: CHANGE_PASSWORD_ACTION, useFactory: changePasswordAction }],
  host: {
    '(document:keydown.escape)': 'closeWithEscape()',
    '(document:click)': 'closeWhenOutside($event)',
  },
})
export class AppShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private openingPassword = false;
  private readonly sectionless = inject(ActivatedRoute).snapshot.data[NO_CURRENT_SECTION] === true;

  private readonly accountButton = viewChild<ElementRef<HTMLButtonElement>>('accountButton');
  private readonly menuButton = viewChild<ElementRef<HTMLButtonElement>>('menuButton');

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly session = this.auth.session;
  protected readonly sections = computed(() => sectionsFor(this.session()));
  protected readonly accountEntries = computed(() => accountEntriesFor(this.session()));
  protected readonly roleLabel = computed(() => roleLabelFor(this.session()));
  protected readonly accountOpen = signal(false);
  protected readonly panelOpen = signal(false);
  protected readonly leaving = signal(false);
  protected readonly toasts = inject(ToastService);

  protected current(entry: NavEntry): boolean {
    return !this.sectionless && isCurrent(entry, this.url());
  }

  protected toggleAccount(): void {
    this.accountOpen.update((open) => !open);
  }

  protected togglePanel(): void {
    this.panelOpen.update((open) => !open);
  }

  /** A link of a menu was followed: the menus close. */
  protected closeMenus(): void {
    this.accountOpen.set(false);
    this.panelOpen.set(false);
  }

  /**
   * A0.6: the menu closes and the dialog opens over the current page. When it closes the focus
   * goes back to the button of the menu it came from; a changed password is told with a toast.
   */
  protected async openChangePassword(): Promise<void> {
    if (this.openingPassword) return;
    this.openingPassword = true;
    const opener = this.panelOpen() ? this.menuButton() : this.accountButton();
    this.closeMenus();
    try {
      const { openChangePasswordFromInjector } =
        await import('@layout/account/change-password-dialog.component');
      if (this.destroyRef.destroyed) return;
      openChangePasswordFromInjector(this.injector, opener?.nativeElement ?? true)
        .afterClosed()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((changed) => {
          if (changed === true) this.toasts.show(PASSWORD_CHANGED_TEXT, { tone: 'success' });
        });
    } catch (error: unknown) {
      if (!this.destroyRef.destroyed) this.toasts.show(toBffError(error).message);
    } finally {
      this.openingPassword = false;
    }
  }

  /** Escape closes the open menu and gives the focus back to the button that opened it. */
  protected closeWithEscape(): void {
    if (this.accountOpen()) {
      this.accountOpen.set(false);
      this.accountButton()?.nativeElement.focus();
    }
    if (this.panelOpen()) {
      this.panelOpen.set(false);
      this.menuButton()?.nativeElement.focus();
    }
  }

  /** A click outside the open menu (and outside its button) closes it. */
  protected closeWhenOutside(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Node)) return;
    const root = this.host.nativeElement;
    if (this.accountOpen() && !root.querySelector('.account')?.contains(target)) {
      this.accountOpen.set(false);
    }
    const insidePanel = [root.querySelector('.panel'), this.menuButton()?.nativeElement].some(
      (element) => element?.contains(target),
    );
    if (this.panelOpen() && !insidePanel) {
      this.panelOpen.set(false);
    }
  }

  /** Closes the session in the BFF (it expires the cookie) and goes back to the login, which says so. */
  protected async leave(): Promise<void> {
    if (this.leaving()) return;
    this.leaving.set(true);
    try {
      await firstValueFrom(this.auth.logout());
      await this.router.navigateByUrl('/login?signedOut=1');
    } catch (error: unknown) {
      this.toasts.show(toBffError(error).message);
    } finally {
      this.leaving.set(false);
    }
  }
}
