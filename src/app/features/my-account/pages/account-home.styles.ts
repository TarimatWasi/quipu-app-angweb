/**
 * The layout of H1 and T1: the notices, «Lo que toca ahora» and the months or the stay one under
 * the other. Notices, panel, table, tiles and buttons are the kit's (QP-UI-01).
 */
export const ACCOUNT_HOME_STYLES = `
  :host {
    display: block;
  }
  .stack {
    display: grid;
    gap: 1.75rem;
    margin-top: 1.75rem;
  }
  .state {
    display: block;
    margin-top: 1.5rem;
  }
  .block {
    display: grid;
    gap: 0.875rem;
  }
  .block h2,
  .block p {
    margin: 0;
  }
  .facts {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--quipu-franja);
    margin: 0;
  }
  .note {
    max-width: 70ch;
    font: var(--mat-sys-body-medium);
    color: var(--quipu-tinta-secundaria);
  }
  .link {
    margin: 0;
  }
  @media (max-width: 599.98px) {
    .facts {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
`;
