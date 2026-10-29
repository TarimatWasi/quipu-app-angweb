import { Component } from '@angular/core';

/**
 * A quipu drawn for Quipu (TAR-218): a main cord and pendant cords whose knots spell base-10
 * numbers, as on a real quipu (single knots for hundreds and tens, one long knot for the units).
 * Decorative only. The plain cords take --quipu-cord and the green ones --quipu-green, so it can
 * hang on the obsidian panel or on the stone ground.
 */
@Component({
  selector: 'app-quipu',
  template: `
    <svg aria-hidden="true" viewBox="0 0 382 372" preserveAspectRatio="xMidYMin meet">
      <path class="main" d="M4 22 Q191 30 378 22" />
      <g class="cord a">
        <path d="M22 24 Q19 174 22 324" />
        <circle cx="21" cy="80" r="5.5" />
        <circle cx="21" cy="148" r="5.5" />
        <circle cx="21" cy="156.5" r="5.5" />
        <rect x="16.5" y="238" width="11" height="38" rx="5.5" />
      </g>
      <g class="cord a">
        <path d="M48 24 Q52 149 48 274" />
        <circle cx="49.3" cy="148" r="5.5" />
        <circle cx="49.3" cy="156.5" r="5.5" />
        <circle cx="49.3" cy="165" r="5.5" />
        <circle cx="49.3" cy="173.5" r="5.5" />
        <circle cx="49.3" cy="182" r="5.5" />
        <circle cx="49.3" cy="190.5" r="5.5" />
        <rect x="42.5" y="238" width="11" height="22" rx="5.5" />
      </g>
      <g class="cord q">
        <path d="M74 24 Q69 189 74 354" />
        <circle cx="72.3" cy="80" r="5.5" />
        <circle cx="72.3" cy="88.5" r="5.5" />
        <circle cx="72.3" cy="97" r="5.5" />
        <rect x="68.5" y="238" width="11" height="26" rx="5.5" />
      </g>
      <g class="cord a">
        <path d="M100 24 Q103 134 100 244" />
        <circle cx="101" cy="148" r="5.5" />
        <circle cx="101" cy="156.5" r="5.5" />
        <circle cx="101" cy="165" r="5.5" />
        <circle cx="101" cy="173.5" r="5.5" />
      </g>
      <g class="cord c">
        <path d="M126 24 Q122 169 126 314" />
        <circle cx="124.7" cy="80" r="5.5" />
        <circle cx="124.7" cy="88.5" r="5.5" />
        <circle cx="124.7" cy="148" r="5.5" />
      </g>
      <g class="cord a">
        <path d="M152 24 Q157 144 152 264" />
        <circle cx="153.7" cy="148" r="5.5" />
        <circle cx="153.7" cy="156.5" r="5.5" />
        <circle cx="153.7" cy="165" r="5.5" />
        <circle cx="153.7" cy="173.5" r="5.5" />
        <circle cx="153.7" cy="182" r="5.5" />
        <circle cx="153.7" cy="190.5" r="5.5" />
        <circle cx="153.7" cy="199" r="5.5" />
        <circle cx="153.7" cy="207.5" r="5.5" />
        <circle cx="153.7" cy="216" r="5.5" />
        <rect x="146.5" y="238" width="11" height="18" rx="5.5" />
      </g>
      <g class="cord v">
        <path d="M178 24 Q175 179 178 334" />
        <circle cx="177" cy="80" r="5.5" />
        <circle cx="177" cy="148" r="5.5" />
        <circle cx="177" cy="156.5" r="5.5" />
        <circle cx="177" cy="165" r="5.5" />
        <circle cx="177" cy="173.5" r="5.5" />
        <circle cx="177" cy="182" r="5.5" />
        <rect x="172.5" y="238" width="11" height="14" rx="5.5" />
      </g>
      <g class="cord a">
        <path d="M204 24 Q208 124 204 224" />
        <circle cx="205.3" cy="148" r="5.5" />
        <circle cx="205.3" cy="156.5" r="5.5" />
        <circle cx="205.3" cy="165" r="5.5" />
      </g>
      <g class="cord q">
        <path d="M230 24 Q225 191.5 230 359" />
        <circle cx="228.3" cy="80" r="5.5" />
        <circle cx="228.3" cy="88.5" r="5.5" />
        <circle cx="228.3" cy="97" r="5.5" />
        <circle cx="228.3" cy="105.5" r="5.5" />
        <rect x="224.5" y="238" width="11" height="10" rx="5.5" />
      </g>
      <g class="cord a">
        <path d="M256 24 Q259 154 256 284" />
        <circle cx="257" cy="148" r="5.5" />
        <circle cx="257" cy="156.5" r="5.5" />
        <circle cx="257" cy="165" r="5.5" />
        <circle cx="257" cy="173.5" r="5.5" />
        <circle cx="257" cy="182" r="5.5" />
        <circle cx="257" cy="190.5" r="5.5" />
        <circle cx="257" cy="199" r="5.5" />
        <rect x="250.5" y="238" width="11" height="26" rx="5.5" />
      </g>
      <g class="cord a">
        <path d="M282 24 Q278 139 282 254" />
        <circle cx="280.7" cy="80" r="5.5" />
        <circle cx="280.7" cy="148" r="5.5" />
        <rect x="276.5" y="238" width="11" height="38" rx="5.5" />
      </g>
      <g class="cord c">
        <path d="M308 24 Q313 174 308 324" />
        <circle cx="309.7" cy="80" r="5.5" />
        <circle cx="309.7" cy="88.5" r="5.5" />
        <circle cx="309.7" cy="148" r="5.5" />
        <circle cx="309.7" cy="156.5" r="5.5" />
        <circle cx="309.7" cy="165" r="5.5" />
        <circle cx="309.7" cy="173.5" r="5.5" />
        <circle cx="309.7" cy="182" r="5.5" />
        <circle cx="309.7" cy="190.5" r="5.5" />
      </g>
      <g class="cord a">
        <path d="M334 24 Q331 131.5 334 239" />
        <circle cx="333" cy="148" r="5.5" />
        <circle cx="333" cy="156.5" r="5.5" />
        <circle cx="333" cy="165" r="5.5" />
        <circle cx="333" cy="173.5" r="5.5" />
        <circle cx="333" cy="182" r="5.5" />
      </g>
      <g class="cord v">
        <path d="M360 24 Q364 164 360 304" />
        <circle cx="361.3" cy="80" r="5.5" />
        <circle cx="361.3" cy="148" r="5.5" />
        <circle cx="361.3" cy="156.5" r="5.5" />
        <circle cx="361.3" cy="165" r="5.5" />
        <circle cx="361.3" cy="173.5" r="5.5" />
        <rect x="354.5" y="238" width="11" height="18" rx="5.5" />
      </g>
    </svg>
  `,
  styles: `
    :host {
      display: block;
    }
    svg {
      display: block;
      width: 100%;
      height: 100%;
      fill: none;
      stroke-width: 4;
      stroke-linecap: round;
    }
    .main {
      stroke: var(--quipu-cord);
      stroke-width: 7;
    }
    .cord {
      stroke: var(--quipu-cord);
      color: var(--quipu-cord);
      transform-box: fill-box;
      transform-origin: top;
      animation: hang 280ms var(--quipu-ease) backwards;
    }
    /* Las cuerdas cuelgan una tras otra, 40 ms entre cada una. */
    .cord:nth-of-type(2) {
      animation-delay: 40ms;
    }
    .cord:nth-of-type(3) {
      animation-delay: 80ms;
    }
    .cord:nth-of-type(4) {
      animation-delay: 120ms;
    }
    .cord:nth-of-type(5) {
      animation-delay: 160ms;
    }
    .cord:nth-of-type(6) {
      animation-delay: 200ms;
    }
    .cord:nth-of-type(7) {
      animation-delay: 240ms;
    }
    .cord:nth-of-type(8) {
      animation-delay: 280ms;
    }
    .cord:nth-of-type(9) {
      animation-delay: 320ms;
    }
    .cord:nth-of-type(10) {
      animation-delay: 360ms;
    }
    .cord:nth-of-type(11) {
      animation-delay: 400ms;
    }
    .cord:nth-of-type(12) {
      animation-delay: 440ms;
    }
    .cord:nth-of-type(13) {
      animation-delay: 480ms;
    }
    .cord:nth-of-type(14) {
      animation-delay: 520ms;
    }
    .cord :is(circle, rect) {
      stroke: none;
      fill: currentColor;
    }
    .q {
      stroke: var(--quipu-qolle);
      color: var(--quipu-qolle);
    }
    .c {
      stroke: var(--quipu-cochinilla);
      color: var(--quipu-cochinilla);
    }
    .v {
      stroke: var(--quipu-green);
      color: var(--quipu-green);
    }
    @keyframes hang {
      from {
        opacity: 0;
        transform: scaleY(0.85);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .cord {
        animation: none;
      }
    }
  `,
})
export class QuipuComponent {}
