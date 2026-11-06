/**
 * Layout of the guest pages (A3.2, A3.5) on the approved canvas (TAR-218): "Volver a …", title in
 * Fraunces with today's date, two columns (content and facts), badges, skeletons and notices.
 */
export const GUEST_PAGE_STYLES = `
  :host {
    display: block;
  }
  h2 {
    margin: 0 0 14px;
    font-size: 20px;
    font-weight: 800;
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
    background: var(--quipu-piedra-oscura);
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
    font-family: var(--mat-sys-headline-large-font);
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
  .tone-ok { background: var(--quipu-verde-fondo); color: var(--quipu-verde-texto); }
  .tone-wait { background: var(--quipu-amarillo-fondo); color: var(--quipu-amarillo-texto); }
  .tone-none { background: var(--quipu-piedra-oscura); color: var(--quipu-tinta-secundaria); }
  .tone-bad { background: var(--quipu-rojo-fondo); color: var(--quipu-rojo-texto); }
  .notice {
    margin: 24px 0 0;
    padding: 14px 18px;
    border-radius: 4px;
    font-size: 16px;
    line-height: 1.5;
  }
  .notice.warn { display: block; background: var(--quipu-amarillo-fondo); color: var(--quipu-amarillo-texto); }
  .notice.error { background: var(--quipu-rojo-fondo); color: var(--quipu-rojo-texto); }
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
`;
