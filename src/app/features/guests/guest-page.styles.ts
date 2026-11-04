/** Layout of the guest pages (A3.2, A3.5), on the visual system of TAR-218. */
export const GUEST_PAGE_STYLES = `
  :host {
    display: block;
  }
  .page {
    display: grid;
    gap: 1.5rem;
    max-width: 72rem;
  }
  .head,
  .section-head {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    justify-content: space-between;
    gap: 1rem;
  }
  h1,
  h2 {
    margin: 0;
    font-family: var(--mat-sys-display-small-font, 'Fraunces', Georgia, serif);
    font-weight: 600;
  }
  h2 {
    font-size: 1.375rem;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .muted,
  .help {
    display: block;
    margin: 0;
    color: var(--mat-sys-on-surface-variant);
    font: var(--mat-sys-body-small);
  }
  .error {
    margin: 0;
    color: var(--mat-sys-error);
    font: var(--mat-sys-body-small);
  }
  .quipu-alert p {
    margin: 0 0 0.5rem;
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
