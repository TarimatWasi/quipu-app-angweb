/** Layout shared by the pages that are a single form (change and recovery of password); the auth shell centers it. */
export const FORM_PAGE_STYLES = `
  :host {
    display: block;
  }
  form,
  section {
    display: grid;
    gap: 0.5rem;
    width: min(25rem, 100%);
  }
  .error {
    margin: 0 0 0.5rem;
    color: var(--mat-sys-error);
    font: var(--mat-sys-body-small);
  }
`;
