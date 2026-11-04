/**
 * Layout of the guest pages (A3.2, A3.5) on the approved canvas (TAR-218): "Volver a …", title in
 * Fraunces with today's date, two columns (content and facts), badges, skeletons and notices.
 */
export const GUEST_PAGE_STYLES = `
  :host {
    display: block;
  }
  .back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 0;
    font-weight: 700;
    text-underline-offset: 4px;
  }
  .title {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 6px 24px;
    margin-top: 6px;
  }
  h1 {
    margin: 0;
    font-family: 'Fraunces', Georgia, serif;
    font-weight: 600;
    font-size: clamp(2.5rem, 5vw, 3.5rem);
    line-height: 1.05;
    letter-spacing: -0.03em;
  }
  .today {
    margin: 0;
    font-size: 18px;
    color: var(--mat-sys-on-surface-variant);
  }
  h2 {
    margin: 0 0 14px;
    font-size: 20px;
    font-weight: 800;
  }
  .layout {
    display: grid;
    gap: 40px 56px;
    margin-top: 32px;
    align-items: start;
    grid-template-columns: minmax(0, 1.4fr) minmax(320px, 1fr);
  }
  .layout > * {
    min-width: 0;
  }
  @media (max-width: 900px) {
    .layout {
      grid-template-columns: 1fr;
    }
  }
  .facts {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 3px;
    margin: 0;
  }
  .facts > div {
    padding: 18px 20px;
    border-radius: 4px;
    background: #dfe4dc;
  }
  .facts .wide {
    grid-column: 1 / -1;
  }
  dt {
    font-size: 15px;
    font-weight: 700;
    color: var(--mat-sys-on-surface-variant);
  }
  dd {
    margin: 8px 0 0;
    font-family: 'Fraunces', Georgia, serif;
    font-size: clamp(1.5rem, 2.4vw, 1.875rem);
    line-height: 1.15;
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }
  dd.badge-cell {
    margin-top: 10px;
    font: inherit;
  }
  .note {
    margin: 14px 0 0;
    font-size: 15px;
    line-height: 1.5;
    color: var(--mat-sys-on-surface-variant);
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    border-radius: 4px;
    font-size: 15px;
    font-weight: 700;
    white-space: nowrap;
  }
  .badge::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
  }
  .tone-ok { background: #d5e7dc; color: #14532d; }
  .tone-wait { background: #f7e7b3; color: #4a3600; }
  .tone-none { background: #dfe4dc; color: #3d4842; }
  .tone-bad { background: #f6dedc; color: #7a1010; }
  .notice {
    margin: 24px 0 0;
    padding: 14px 18px;
    border-radius: 4px;
    font-size: 16px;
    line-height: 1.5;
  }
  .notice.warn { display: block; background: #f7e7b3; color: #4a3600; }
  .notice.error { background: #f6dedc; color: #7a1010; }
  .link-button {
    height: 44px;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    font-weight: 800;
    text-decoration: underline;
    text-underline-offset: 4px;
    cursor: pointer;
  }
  .sk {
    border-radius: 4px;
    background: #dfe4dc;
    animation: sk 1.4s ease-in-out infinite;
  }
  @keyframes sk {
    50% { opacity: 0.55; }
  }
  @media (prefers-reduced-motion: reduce) {
    .sk { animation: none; }
  }
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
`;
