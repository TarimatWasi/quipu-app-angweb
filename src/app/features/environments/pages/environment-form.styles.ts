import { FORM_SUMMARY_PAGE_STYLES } from '@shared/forms/form-summary-page.styles';

/** A2.1 and A2.4: the layout of a form with its summary, and the short field of the code. */
export const ENVIRONMENT_FORM_STYLES = `${FORM_SUMMARY_PAGE_STYLES}
  .code {
    max-width: var(--quipu-campo-corto);
  }
`;
