import { NgOptimizedImage, NgTemplateOutlet } from '@angular/common';
import { Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, firstValueFrom, map } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { accountEntriesFor, isCurrent, NavEntry, roleLabelFor, sectionsFor } from './app-nav';

/**
 * Frame of the pages behind the login (QP-ANGWEB-ORG-01), the bar P-01: the emblem and «Quipu», the
 * menu of the role with its current section underlined in q'olle, and the account menu (Cambiar
 * contraseña, Administradores for the administrator, Salir); under it the 20 px band, then the
 * page's single main landmark. On a phone the menu and the account go into a panel behind «Menú».
 * A session without sections (onboarding) only has «Salir».
 */
@Component({
  selector: 'app-shell',
  imports: [NgOptimizedImage, NgTemplateOutlet, RouterLink, RouterOutlet],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
  host: {
    '(document:keydown.escape)': 'closeWithEscape()',
    '(document:click)': 'closeWhenOutside($event)',
  },
})
export class AppShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

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

  protected current(entry: NavEntry): boolean {
    return isCurrent(entry, this.url());
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

  /** Closes the session in the BFF (it expires the cookie) and goes back to the login. */
  protected async leave(): Promise<void> {
    if (this.leaving()) return;
    this.leaving.set(true);
    await firstValueFrom(this.auth.logout());
    await this.router.navigateByUrl('/login');
  }
}
