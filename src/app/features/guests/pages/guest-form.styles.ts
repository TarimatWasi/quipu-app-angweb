/** What the forms of A3.5 need on top of the guest page layout. */
export const GUEST_FORM_STYLES = `
  form {
    display: grid;
    gap: 1.5rem;
    max-width: 40rem;
  }
  fieldset {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
    gap: 1rem;
    margin: 0;
    padding: 1rem;
    border: 1px solid var(--mat-sys-outline-variant);
    border-radius: 4px;
  }
  legend {
    padding: 0 0.25rem;
    font-weight: 700;
  }
  fieldset .error {
    grid-column: 1 / -1;
  }
  .field {
    display: grid;
    gap: 0.25rem;
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
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 1rem;
  }
`;
