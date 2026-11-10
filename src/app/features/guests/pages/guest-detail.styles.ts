/**
 * The layout of A3.2: the panel, then two columns (the payments or stays at 1.4fr and the facts at
 * 320 px or more), one column on a phone. Panel, tables, cards, tiles, badges, notices and buttons
 * are the kit's (styles.scss, shared/ui); here only places and gaps (QP-UI-01).
 */
export const GUEST_DETAIL_STYLES = `
  :host {
    display: block;
  }
  .state {
    display: block;
    margin-top: 1.5rem;
  }
  .now {
    margin-top: 1.75rem;
  }
  .layout {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(var(--quipu-columna-resumen), 1fr);
    align-items: start;
    gap: 2.5rem 3.5rem;
    margin-top: 2.5rem;
  }
  .layout.single {
    grid-template-columns: minmax(0, var(--quipu-columna-formulario));
  }
  .layout > * {
    min-width: 0;
  }
  .blocked {
    display: grid;
    gap: 1rem;
  }
  .charges {
    display: grid;
    gap: 2.5rem;
  }
  .charges > * {
    min-width: 0;
  }
  .blocked h2 {
    margin: 0;
  }
  aside {
    display: grid;
    gap: 2rem;
  }
  @media (max-width: 900px) {
    .layout {
      grid-template-columns: minmax(0, 1fr);
    }
  }
`;
