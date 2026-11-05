/**
 * The layout A3.1 and A3.7 share: the work on the left (up to 680 px) and the summary of facts on
 * dark stone on the right (320 px or more); on a phone, one column with the summary on top. Facts,
 * fields, buttons and notices are the kit's (styles.scss); here only places and gaps.
 */
export const SUMMARY_LAYOUT_STYLES = `
  :host {
    display: block;
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
  .main {
    order: 1;
    display: grid;
    gap: 2rem;
    max-width: var(--quipu-columna-formulario);
  }
  .summary {
    order: 2;
    display: grid;
    gap: 1rem;
  }
  h2 {
    margin: 0;
  }
  p {
    margin: 0;
  }
  .facts {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--quipu-franja);
  }
  .facts app-fact-tile {
    --quipu-cifra-ficha: var(--quipu-cifra-resumen);
    --quipu-cifra-ficha-movil: var(--quipu-cifra-resumen-movil);
    overflow-wrap: anywhere;
  }
  .facts .wide {
    grid-column: 1 / -1;
  }
  .note {
    color: var(--quipu-tinta-secundaria);
  }
  .section {
    display: grid;
    gap: 1.25rem;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem 1.5rem;
  }
  .big {
    min-height: var(--quipu-alto-boton-grande);
  }
  @media (max-width: 900px) {
    .layout {
      grid-template-columns: minmax(0, 1fr);
    }
    .summary {
      order: 0;
    }
  }
  @media (max-width: 599.98px) {
    .actions {
      display: grid;
    }
    .actions .quipu-button--primary,
    .actions .quipu-button--secondary {
      width: 100%;
    }
  }
`;
