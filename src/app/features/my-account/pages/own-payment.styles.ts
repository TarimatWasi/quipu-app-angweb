/** What the guest's payment pages (H3, H4, T2) add to the payment page layout. */
export const OWN_PAYMENT_STYLES = `
  .badge {
    display: inline-block;
    margin: 0;
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    background: var(--mat-sys-surface-variant);
    font-weight: 700;
  }
  .badge.status-APPROVED {
    background: var(--mat-sys-primary-container);
    color: var(--mat-sys-primary);
  }
  .badge.status-REJECTED {
    background: var(--mat-sys-error-container);
    color: var(--mat-sys-on-error-container);
  }
  .proof-list {
    display: grid;
    gap: 0.5rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .history {
    display: grid;
    gap: 1rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .history > li {
    display: grid;
    gap: 0.5rem;
    padding: 1rem;
    border: 1px solid var(--mat-sys-outline-variant);
    border-radius: 4px;
  }
  .history-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem 1rem;
  }
  .reason {
    margin: 0;
  }
  output {
    display: block;
  }
`;
