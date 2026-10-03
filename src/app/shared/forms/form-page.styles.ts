/** Layout shared by the pages that are a single centered form (change and recovery of password). */
export const FORM_PAGE_STYLES = `
  :host {
    display: grid;
    place-items: center;
    min-height: 100dvh;
    padding: 1rem;
  }
  form,
  section {
    display: grid;
    gap: 0.5rem;
    width: min(24rem, 100%);
  }
  .error {
    margin: 0 0 0.5rem;
    color: var(--mat-sys-error);
    font: var(--mat-sys-body-small);
  }
`;
