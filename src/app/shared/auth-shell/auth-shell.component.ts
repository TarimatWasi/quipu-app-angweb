import { NgOptimizedImage } from '@angular/common';
import { Component } from '@angular/core';
import { QuipuComponent } from '@shared/quipu/quipu.component';

/**
 * Frame of the pages anyone can open (login, recovery, password change): the brand panel with the
 * emblem on one side and the form on the other; on a narrow screen the panel is a strip on top.
 * The projected content is the form and goes inside the page's single main landmark.
 */
@Component({
  selector: 'app-auth-shell',
  imports: [NgOptimizedImage, QuipuComponent],
  template: `
    <div class="frame">
      <header class="panel">
        <app-quipu class="quipu" />
        <div class="brand">
          <img class="emblem" ngSrc="emblema.png" priority alt="" width="132" height="132" />
          <p class="name">Quipu</p>
        </div>
        <div class="band" aria-hidden="true"></div>
      </header>
      <main class="content"><ng-content /></main>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .frame {
      display: grid;
      grid-template-columns: minmax(18rem, 42%) 1fr;
      min-height: 100dvh;
    }
    .panel {
      display: grid;
      grid-template-rows: 1fr auto auto;
      gap: 2rem;
      background: var(--quipu-obsidiana);
      color: var(--quipu-alpaca);
      padding: 2.5rem 2.25rem 0;
      overflow: hidden;
    }
    .quipu {
      min-height: 0;
      --quipu-cord: var(--quipu-alpaca);
      --quipu-green: var(--quipu-chilca-clara);
    }
    .brand {
      display: grid;
      grid-template-columns: auto 1fr;
      align-items: center;
      column-gap: 1rem;
    }
    .emblem {
      width: 4.5rem;
      height: 4.5rem;
    }
    .name {
      margin: 0;
      font-family: var(--mat-sys-display-small-font, 'Fraunces', Georgia, serif);
      font-size: clamp(3.25rem, 5.5vw, 5rem);
      font-weight: 600;
      line-height: 1;
      letter-spacing: -0.03em;
    }
    .band {
      height: 2.5rem;
      margin-inline: -2.25rem;
      /* Cenefa escalonada del emblema (SVG 40x40 en línea, los estilos del componente deben ser estáticos). */
      background-image: url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2240%22%20height%3D%2240%22%20viewBox%3D%220%200%2040%2040%22%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%23f4f1ea%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M0%2018%20L10%206%20L20%2018%20L30%206%20L40%2018%22%2F%3E%3Cpath%20d%3D%22M0%2034%20L10%2022%20L20%2034%20L30%2022%20L40%2034%22%2F%3E%3C%2Fg%3E%3Cpath%20d%3D%22M10%2012%20L15%2018%20H5Z%20M30%2012%20L35%2018%20H25Z%22%20fill%3D%22%23b0263f%22%2F%3E%3Cpath%20d%3D%22M10%2028%20L15%2034%20H5Z%20M30%2028%20L35%2034%20H25Z%22%20fill%3D%22%23e3b02a%22%2F%3E%3C%2Fsvg%3E');
      background-repeat: repeat-x;
      background-position: left bottom;
    }
    .content {
      display: grid;
      place-items: center;
      padding: 2.5rem 2rem;
    }
    @media (max-width: 47.5rem) {
      .frame {
        grid-template-columns: 1fr;
        grid-template-rows: auto 1fr;
      }
      .panel {
        grid-template-rows: auto auto;
        gap: 0.875rem;
        padding: 1rem 1.25rem 0;
      }
      .quipu {
        display: none;
      }
      .brand {
        column-gap: 0.75rem;
      }
      .emblem {
        width: 3.5rem;
        height: 3.5rem;
      }
      .name {
        font-size: 1.875rem;
      }
      .band {
        height: 1.75rem;
        margin-inline: -1.25rem;
      }
      .content {
        align-items: start;
        padding: 1.75rem 1.25rem 2.5rem;
      }
    }
  `,
})
export class AuthShellComponent {}
