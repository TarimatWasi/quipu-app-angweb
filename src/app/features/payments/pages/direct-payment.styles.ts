/** What only A5.1 needs on top of the payment page layout. */
export const DIRECT_PAYMENT_STYLES = `
  form {
    display: grid;
    gap: 1.5rem;
    max-width: 40rem;
  }
  fieldset {
    margin: 0;
    padding: 1rem;
    border: 1px solid var(--mat-sys-outline-variant);
    border-radius: 4px;
  }
  legend {
    padding: 0 0.25rem;
    font-weight: 700;
  }
  .kinds {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    margin-bottom: 1rem;
  }
  .field {
    display: grid;
    gap: 0.25rem;
    margin-bottom: 1rem;
  }
  .field:last-child {
    margin-bottom: 0;
  }
  .field input,
  .field select {
    padding: 0.75rem;
    border: 1px solid var(--mat-sys-outline);
    border-radius: 4px;
    font: inherit;
    background: var(--mat-sys-surface);
    color: inherit;
  }
  .shortcuts {
    display: flex;
    gap: 0.5rem;
  }
  .proofs {
    display: grid;
    gap: 1rem;
  }
  .help {
    margin: 0;
    color: var(--mat-sys-on-surface-variant);
    font: var(--mat-sys-body-small);
  }
  .error {
    margin: 0;
    color: var(--mat-sys-error);
    font: var(--mat-sys-body-small);
  }
  .to-complete {
    margin: 0;
    padding-left: 1.25rem;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 1rem;
  }
`;
