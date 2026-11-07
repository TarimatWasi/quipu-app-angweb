/**
 * The layout of H5 and T3: the form at 1.4fr on the left and, on the right, what the administration
 * keeps and the documents, at 320 px or more. On a phone one column, with the side first, as the
 * canvas «MisDatos» has it. Fields, tiles, notices and buttons are the kit's; here only places and
 * gaps (QP-UI-01).
 */
export const OWN_PROFILE_STYLES = `
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
    display: grid;
    gap: 1.75rem;
    max-width: var(--quipu-columna-formulario);
  }
  .side {
    order: 2;
    display: grid;
    gap: 2rem;
  }
  .block {
    display: grid;
    gap: 0.875rem;
    justify-items: start;
  }
  .block h2,
  .block p {
    margin: 0;
  }
  .facts {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--quipu-franja);
    width: 100%;
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
    font: var(--mat-sys-body-medium);
    color: var(--quipu-tinta-secundaria);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem 1.25rem;
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
