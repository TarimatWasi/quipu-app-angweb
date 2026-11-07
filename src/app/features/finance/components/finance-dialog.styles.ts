/**
 * The layout of the dialogs of A6. Frame, title, buttons, fields and alert are the kit's (P-16,
 * P-10, P-07, P-09); here only the gaps, the pair of fields of a row and the shortcuts under a field.
 */
export const FINANCE_DIALOG_STYLES = `
  .body {
    display: grid;
    gap: 1rem;
  }
  p {
    margin: 0;
  }
  .row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }
  .shortcuts {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .what {
    display: grid;
    gap: 0.25rem;
  }
  .what span {
    color: var(--quipu-tinta-secundaria);
  }
  @media (max-width: 599.98px) {
    .row {
      grid-template-columns: minmax(0, 1fr);
    }
  }
`;
