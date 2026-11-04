/** Layout shared by the payment pages (A5, A5.2), on the visual system of TAR-218. */
export const PAYMENT_PAGE_STYLES = `
  :host {
    display: block;
  }
  .page {
    display: grid;
    gap: 1.5rem;
    max-width: 72rem;
  }
  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    justify-content: space-between;
    gap: 1rem;
  }
  .views,
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .views .current {
    background: var(--mat-sys-primary);
    color: var(--mat-sys-on-primary);
  }
  .table-wrap {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th,
  td {
    padding: 0.75rem;
    border-bottom: 1px solid var(--mat-sys-outline-variant);
    text-align: left;
    vertical-align: top;
  }
  th {
    font: var(--mat-sys-label-large);
    color: var(--mat-sys-on-surface-variant);
  }
  .strong {
    display: block;
    font-weight: 700;
  }
  .muted {
    display: block;
    margin: 0;
    color: var(--mat-sys-on-surface-variant);
    font: var(--mat-sys-body-small);
  }
  .empty {
    margin: 0;
    font-size: 1.25rem;
  }
  .more {
    justify-self: start;
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
