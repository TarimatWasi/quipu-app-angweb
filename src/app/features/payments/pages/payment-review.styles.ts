/** What only A5.2 needs on top of the payment page layout. */
export const PAYMENT_REVIEW_STYLES = `
  h2 {
    margin: 0 0 0.75rem;
    font-family: var(--mat-sys-display-small-font, 'Fraunces', Georgia, serif);
    font-size: 1.375rem;
    font-weight: 600;
  }
  .badge {
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
  .proofs {
    display: grid;
    gap: 1rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .proof {
    display: grid;
    gap: 0.25rem;
    padding: 1rem;
    border: 1px solid var(--mat-sys-outline-variant);
    border-radius: 4px;
  }
  .proof p {
    margin: 0;
  }
  .amount {
    display: grid;
    gap: 0.25rem;
    max-width: 16rem;
    margin-top: 0.5rem;
  }
  .amount input {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--mat-sys-outline);
    border-radius: 4px;
    font: inherit;
    background: var(--mat-sys-surface);
  }
  .error {
    margin: 0;
    color: var(--mat-sys-error);
    font: var(--mat-sys-body-small);
  }
  .balance {
    margin: 0.75rem 0 0;
    font-weight: 700;
  }
  .balance.short {
    color: var(--mat-sys-error);
  }
  .balance.complete,
  .balance.over {
    color: var(--mat-sys-primary);
  }
  .outcome,
  .info {
    margin: 0;
    padding: 1rem;
    border-radius: 4px;
    background: var(--mat-sys-primary-container);
  }
`;
