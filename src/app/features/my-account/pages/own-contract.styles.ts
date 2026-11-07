/**
 * The layout of H2: one column with the contract in force and, below it, «Tu próximo contrato».
 * Facts, badge, notice, buttons and skeletons are the kit's; here only places and gaps (QP-UI-01).
 */
export const OWN_CONTRACT_STYLES = `
  :host {
    display: block;
  }
  .state {
    display: block;
    margin-top: 1.5rem;
  }
  .page {
    display: grid;
    gap: 3rem;
    margin-top: 2rem;
  }
  .next {
    display: grid;
    gap: 0.875rem;
  }
  .next h2 {
    margin: 0;
  }
  .facts {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  @media (max-width: 599.98px) {
    .facts {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
`;
