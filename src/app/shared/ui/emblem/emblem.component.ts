import { NgOptimizedImage } from '@angular/common';
import { Component } from '@angular/core';

/**
 * The emblem of the brand panel and of the bar (TAR-314): AVIF at 160 px where the browser reads it
 * (under 5 KB) and the PNG where it does not. The page sizes the host (a class of its own); the
 * image fills it. Decorative: the name «Quipu» beside it is the text.
 */
@Component({
  selector: 'app-emblem',
  imports: [NgOptimizedImage],
  template: `
    <picture>
      <source type="image/avif" srcset="emblema-160.avif" />
      <img ngSrc="emblema.png" priority alt="" width="132" height="132" />
    </picture>
  `,
  styles: `
    :host {
      display: block;
    }
    picture,
    img {
      display: block;
      width: 100%;
      height: 100%;
    }
  `,
})
export class EmblemComponent {}
