/** The payment panels of the guests' home (H1, T1), on the visual system of TAR-218. */
export const HOME_PANEL_STYLES = `
  :host {
    display: block;
    margin-top: 2rem;
  }
  .panel {
    display: grid;
    gap: 1rem;
    max-width: 32rem;
  }
  h2 {
    margin: 0;
  }
  p {
    margin: 0;
  }
  .strong {
    display: block;
    font-weight: 700;
  }
  .muted {
    display: block;
    color: var(--mat-sys-on-surface-variant);
  }
  .quipu-alert {
    display: grid;
    gap: 0.5rem;
  }
  .quipu-alert a {
    justify-self: start;
  }
  /* Aviso amarillo (crédito a favor, devolución): q'olle aclarado con texto obsidiana. */
  .notice {
    padding: 0.75rem 1rem;
    border-left: 4px solid var(--quipu-qolle);
    border-radius: 4px;
    background: color-mix(in srgb, var(--quipu-qolle) 22%, var(--quipu-alpaca));
    color: var(--quipu-obsidiana);
  }
  h3 {
    margin: 0 0 0.5rem;
    font: var(--mat-sys-title-medium);
  }
  .due-list {
    display: grid;
    gap: 0.75rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .due-list > li {
    display: grid;
    gap: 0.25rem;
    justify-items: start;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .badge {
    display: inline-block;
    margin-top: 0.25rem;
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    background: var(--mat-sys-surface-variant);
    font-weight: 700;
  }
  .badge.status-PAID {
    background: var(--mat-sys-primary-container);
    color: var(--mat-sys-primary);
  }
  .badge.status-OVERDUE {
    background: var(--mat-sys-error-container);
    color: var(--mat-sys-on-error-container);
  }
`;
