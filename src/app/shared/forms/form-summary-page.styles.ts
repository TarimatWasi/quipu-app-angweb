/**
 * The layout of the pages with a form and a summary (A2.1, A2.4, A4.1): the form at 1.4fr on the left and, on the right, what will be created
 * or how it is today, at 320 px or more; on a phone one column with the side first, as the canvas
 * «AmbienteForm» has it. Fields, tiles, buttons and notices are the kit's; here only places and gaps.
 */
export const FORM_SUMMARY_PAGE_STYLES = `
  :host {
    display: block;
  }
  .state {
    display: block;
    margin-top: 1.5rem;
  }
  .layout {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(var(--quipu-columna-resumen), 1fr);
    align-items: start;
    gap: 2.5rem 3.5rem;
    margin-top: 2rem;
  }
  .layout > * {
    min-width: 0;
  }
  .form {
    order: 1;
    max-width: var(--quipu-columna-formulario);
  }
  .side {
    order: 2;
  }
  h2 {
    margin: 0 0 0.875rem;
  }
  .fields {
    display: grid;
    gap: 1.375rem;
  }
  .facts {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--quipu-franja);
    margin: 0;
  }
  .facts app-fact-tile {
    --quipu-cifra-ficha: var(--quipu-cifra-resumen);
    --quipu-cifra-ficha-movil: var(--quipu-cifra-resumen-movil);
    overflow-wrap: anywhere;
  }
  .facts app-fact-tile.long {
    --quipu-cifra-ficha: var(--quipu-cifra-larga);
    --quipu-cifra-ficha-movil: var(--quipu-cifra-larga-movil);
  }
  .wide {
    grid-column: 1 / -1;
  }
  .note {
    margin: 0.875rem 0 0;
    font: var(--mat-sys-body-medium);
    color: var(--quipu-tinta-secundaria);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem 1.25rem;
    margin-top: 1.75rem;
  }
  .why {
    margin: 0.625rem 0 0;
    font: var(--mat-sys-body-medium);
    color: var(--quipu-tinta-secundaria);
  }
  @media (max-width: 900px) {
    .layout {
      grid-template-columns: minmax(0, 1fr);
    }
    .form,
    .side {
      order: 0;
    }
  }
  @media (max-width: 599.98px) {
    .actions .quipu-button--primary {
      flex: 1 1 100%;
    }
  }
`;
