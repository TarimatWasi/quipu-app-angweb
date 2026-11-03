import { NgOptimizedImage } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { Router, RouterOutlet } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/services/auth.service';

/**
 * Frame of the pages behind the login (QP-ANGWEB-ORG-01): the obsidian bar with the wordmark and
 * "Salir", the band of the emblem under it, and the page's single main landmark, where the child route opens.
 */
@Component({
  selector: 'app-shell',
  imports: [NgOptimizedImage, MatButton, RouterOutlet],
  template: `
    <header class="bar">
      <div class="brand">
        <img class="emblem" ngSrc="emblema.png" priority alt="" width="132" height="132" />
        <p class="name">Quipu</p>
      </div>
      <button mat-stroked-button type="button" [disabled]="leaving()" (click)="leave()">
        Salir
      </button>
    </header>
    <div class="band" aria-hidden="true"></div>
    <main class="content"><router-outlet /></main>
  `,
  styles: `
    :host {
      display: grid;
      grid-template-rows: auto auto 1fr;
      min-height: 100dvh;
    }
    .bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.75rem clamp(1rem, 4vw, 3rem);
      background: var(--quipu-obsidiana);
      color: var(--quipu-alpaca);
      --mat-button-outlined-label-text-color: var(--quipu-alpaca);
      --mat-button-outlined-outline-color: var(--quipu-alpaca);
      --mat-button-outlined-container-height: 40px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .emblem {
      width: 2.75rem;
      height: 2.75rem;
    }
    .name {
      margin: 0;
      font-family: var(--mat-sys-display-small-font, 'Fraunces', Georgia, serif);
      font-size: 1.75rem;
      font-weight: 600;
      line-height: 1;
      letter-spacing: -0.02em;
    }
    .band {
      height: 1.25rem;
      background-color: var(--quipu-obsidiana);
      /* Misma cenefa que el acceso, a media altura. */
      background-image: url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2040%2040%22%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%23f4f1ea%22%20stroke-width%3D%223%22%3E%3Cpath%20d%3D%22M0%2018%20L10%206%20L20%2018%20L30%206%20L40%2018%22%2F%3E%3Cpath%20d%3D%22M0%2034%20L10%2022%20L20%2034%20L30%2022%20L40%2034%22%2F%3E%3C%2Fg%3E%3Cpath%20d%3D%22M10%2012%20L15%2018%20H5Z%20M30%2012%20L35%2018%20H25Z%22%20fill%3D%22%23b0263f%22%2F%3E%3Cpath%20d%3D%22M10%2028%20L15%2034%20H5Z%20M30%2028%20L35%2034%20H25Z%22%20fill%3D%22%23e3b02a%22%2F%3E%3C%2Fsvg%3E');
      background-repeat: repeat-x;
      background-position: left bottom;
    }
    /* Mismos márgenes laterales que la barra. */
    .content {
      padding: clamp(2rem, 6vw, 4.5rem) clamp(1rem, 4vw, 3rem);
    }
  `,
})
export class AppShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly leaving = signal(false);

  /** Closes the session in the BFF (it expires the cookie) and goes back to the login. */
  protected async leave(): Promise<void> {
    if (this.leaving()) return;
    this.leaving.set(true);
    await firstValueFrom(this.auth.logout());
    await this.router.navigateByUrl('/login');
  }
}
