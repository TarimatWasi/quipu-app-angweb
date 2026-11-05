/**
 * Layout of every page that is a single form on the auth shell (A0, A0.1, A0.2, A0.5), as in the
 * canvas board «Ingreso» (TAR-218). The values are the access tokens of styles.scss; the fields use
 * the global P-07 classes and the notices the P-09 ones, so a page adds only what is its own.
 */
export const FORM_PAGE_STYLES = `
  :host {
    display: block;
    --mat-button-filled-container-height: var(--quipu-acceso-alto-boton);
    --mat-button-filled-label-text-size: var(--quipu-texto-intro-size);
  }
  form,
  section {
    display: grid;
    gap: var(--quipu-acceso-espacio);
    width: min(var(--quipu-acceso-ancho), 100%);
  }
  h1 {
    margin: 0;
  }
  .lead {
    margin: calc(-1 * var(--quipu-espacio-campo)) 0 0;
    font: var(--mat-sys-body-large);
    font-size: var(--quipu-texto-intro-size);
    color: var(--quipu-tinta-secundaria);
  }
  .link {
    display: inline-flex;
    align-items: center;
    justify-self: start;
    min-height: var(--quipu-toque);
  }
`;
