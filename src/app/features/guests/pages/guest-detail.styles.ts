/** What only A3.2 needs on top of the guest page layout. */
export const GUEST_DETAIL_STYLES = `
  .facts {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
    gap: 0.75rem 1.5rem;
    margin: 0;
  }
  dt {
    color: var(--mat-sys-on-surface-variant);
    font: var(--mat-sys-label-large);
  }
  dd {
    margin: 0;
    font-weight: 700;
  }
  .badge {
    display: inline-block;
    padding: 0.125rem 0.625rem;
    border-radius: 4px;
    background: var(--mat-sys-surface-variant);
  }
  .stays {
    display: grid;
    gap: 1rem;
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
  .empty {
    margin: 0;
  }
  .more {
    justify-self: start;
  }
`;
