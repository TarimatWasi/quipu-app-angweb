/**
 * The layout of the dialogs of A7. Frame, fields, notices, segmented control and buttons are the
 * kit's (P-16, P-07, P-09, P-10, styles.scss); here only the gaps and the separator.
 */
export const ADMIN_DIALOG_STYLES = `
  .body {
    display: grid;
    gap: 1.125rem;
  }
  p {
    margin: 0;
  }
  fieldset {
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
  }
  legend {
    padding: 0;
    margin-bottom: var(--quipu-espacio-campo);
  }
  hr {
    width: 100%;
    margin: 0.25rem 0;
    border: 0;
    border-top: var(--quipu-borde-ancho) solid var(--quipu-borde-suave);
  }
`;
