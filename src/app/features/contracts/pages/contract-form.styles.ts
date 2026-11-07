import { FORM_SUMMARY_PAGE_STYLES } from '@shared/forms/form-summary-page.styles';

/**
 * A4.1: the layout of a form with its summary, and what the contract form adds: the pickers at the
 * width of a field, the fee, the day and the grace days in one row, and the two dates side by side.
 */
export const CONTRACT_FORM_STYLES = `${FORM_SUMMARY_PAGE_STYLES}
  .pick {
    max-width: 26.25rem;
  }
  .fixed {
    display: grid;
    gap: 0.375rem;
    margin: 0;
  }
  .money-row {
    display: grid;
    grid-template-columns: minmax(0, 12.5rem) minmax(0, 10rem) minmax(0, 10rem);
    gap: 1rem;
  }
  .dates {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 13.75rem));
    gap: 1rem;
  }
  @media (max-width: 599.98px) {
    .money-row {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .money-row > :first-child {
      grid-column: 1 / -1;
    }
    .dates {
      grid-template-columns: minmax(0, 1fr);
    }
  }
`;
