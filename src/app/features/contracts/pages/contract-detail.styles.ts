import { FORM_SUMMARY_PAGE_STYLES } from '@shared/forms/form-summary-page.styles';

/**
 * A4.2: the layout of the months on the left and «Lo acordado» on the right, which the pages with a
 * form and a summary share, and what the contract adds under its panel: the badge and the action,
 * the file and the links.
 */
export const CONTRACT_DETAIL_STYLES = `${FORM_SUMMARY_PAGE_STYLES}
  .now {
    display: block;
    margin-top: 2rem;
  }
  .now + .layout {
    margin-top: 2.5rem;
  }
  .panel-extra {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem 1rem;
  }
  .form {
    max-width: none;
    display: grid;
    gap: 0.875rem;
  }
  .form .note {
    margin: 0;
  }
  .file {
    display: grid;
    justify-items: start;
    gap: 0.5rem;
    margin-top: 2rem;
  }
  .file h2,
  .file p {
    margin: 0;
  }
  .file-name {
    font-weight: var(--quipu-peso-enfasis);
    overflow-wrap: anywhere;
  }
  .links {
    display: grid;
    gap: 0.5rem;
    margin: 1.5rem 0 0;
    padding: 0;
    list-style: none;
  }
  .links li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem 0.75rem;
  }
  .hint {
    font: var(--mat-sys-body-small);
    color: var(--quipu-tinta-secundaria);
  }
`;
