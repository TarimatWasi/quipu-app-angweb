/**
 * What the three steps of the registration place themselves: the form's rhythm, the rows of files
 * and the actions. Fields, buttons, notices and cards are the kit's (QP-UI-01).
 */
export const ONBOARDING_STYLES = `
  :host {
    display: block;
  }
  .state {
    display: block;
  }
  .form,
  .blocks {
    display: grid;
    gap: 1.75rem;
    max-width: var(--quipu-columna-formulario);
  }
  .block {
    display: grid;
    gap: 0.875rem;
  }
  .block h2,
  .block p {
    margin: 0;
  }
  .optional {
    font-weight: normal;
    color: var(--quipu-tinta-secundaria);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem 1.25rem;
  }
  .after {
    margin: 0;
    font: var(--mat-sys-body-medium);
    color: var(--quipu-tinta-secundaria);
  }
  .rows {
    display: grid;
    gap: var(--quipu-franja);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .item {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 1rem;
    padding: var(--quipu-relleno-tarjeta);
    border-radius: var(--quipu-radio);
    background: var(--quipu-alpaca);
  }
  .item.chosen {
    background: var(--quipu-piedra-oscura);
  }
  .item.invalid {
    outline: var(--quipu-borde-ancho-enfasis) solid var(--quipu-error);
  }
  .what {
    display: grid;
    flex: 1 1 10rem;
    min-width: 0;
  }
  .what strong {
    overflow-wrap: anywhere;
  }
  .meta {
    font: var(--mat-sys-body-small);
    color: var(--quipu-tinta-secundaria);
  }
  .sub {
    margin: 0;
    font-weight: var(--quipu-peso-enfasis);
    color: var(--quipu-tinta-secundaria);
  }
`;
