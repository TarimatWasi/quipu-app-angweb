/**
 * The layout of A1: «Lo que toca ahora», «Para empezar» and «Cobros del mes» one under the other.
 * Panel, list, bar, tiles, filters, table, badges and buttons are the kit's; here only places and
 * gaps (QP-UI-01).
 */
export const ADMIN_HOME_STYLES = `
  :host {
    display: block;
  }
  .state {
    display: block;
    margin-top: 1.5rem;
  }
  .skeleton {
    display: block;
    margin-top: 1.75rem;
  }
  .skeleton-rows {
    display: grid;
    gap: var(--quipu-franja);
    margin-top: 1.75rem;
  }
  .now {
    margin-top: 1.75rem;
  }
  .steps {
    margin-top: 2.5rem;
  }
  .month {
    margin-top: 3rem;
  }
  h2 {
    margin: 0 0 0.875rem;
  }
  .filters {
    display: block;
    margin-top: 1.5rem;
  }
  .list {
    margin-top: 0.5rem;
  }
`;
