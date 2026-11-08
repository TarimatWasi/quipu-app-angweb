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
  .block {
    display: grid;
    gap: 0.875rem;
    align-content: start;
  }
  .block h2,
  .skeleton-state {
    margin: 0;
  }
  .skeleton-state {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.625rem 1rem;
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
