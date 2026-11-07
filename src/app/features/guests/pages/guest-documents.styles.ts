/**
 * The layout of A3.8: the documents and the history at 1.4fr, «De quién son» at 320 px or more,
 * one column on a phone. Lists, tiles, notices, buttons and the dialog are the kit's; here only
 * places and gaps (QP-UI-01).
 */
export const GUEST_DOCUMENTS_STYLES = `
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
  .main {
    display: grid;
    gap: 2.5rem;
    max-width: var(--quipu-columna-formulario);
  }
  .who {
    display: grid;
    gap: 0.875rem;
  }
  .who h2,
  .who p {
    margin: 0;
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
  .wide {
    grid-column: 1 / -1;
  }
  .note {
    font: var(--mat-sys-body-medium);
    color: var(--quipu-tinta-secundaria);
  }
  @media (max-width: 900px) {
    .layout {
      grid-template-columns: minmax(0, 1fr);
    }
  }
`;
