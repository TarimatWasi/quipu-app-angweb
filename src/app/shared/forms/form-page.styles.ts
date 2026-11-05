/**
 * Layout of the pages that are a single form on the auth shell (A0.1, A0.2, A0.5), as in the
 * canvas board «Ingreso» (TAR-218): a 420 px column with 18 px between blocks, the lead under the
 * title, a 52 px primary button and the links aligned to the start. The fields use the global
 * `quipu-field` classes (P-07).
 */
export const FORM_PAGE_STYLES = `
  :host {
    display: block;
    --mat-button-filled-container-height: 52px;
    --mat-button-filled-label-text-size: 1.0625rem;
  }
  form,
  section {
    display: grid;
    gap: 18px;
    width: min(26.25rem, 100%);
  }
  h1 {
    margin: 0;
  }
  .lead {
    margin: -6px 0 0;
    font-size: 1.0625rem;
    line-height: 1.5;
    color: var(--quipu-tinta-secundaria);
  }
  .link {
    justify-self: start;
    padding: 8px 0;
  }
`;
