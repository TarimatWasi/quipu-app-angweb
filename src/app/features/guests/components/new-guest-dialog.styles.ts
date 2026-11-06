/**
 * The layout of the dialogs of A3.1. Frame, title, buttons, badge and alert are the kit's (P-16,
 * P-10, P-08, P-09); here only the stone card of the guest, the gaps and the list of what it owes.
 */
export const NEW_GUEST_DIALOG_STYLES = `
  .body {
    display: grid;
    gap: 1rem;
  }
  p {
    margin: 0;
  }
  .card {
    display: grid;
    justify-items: start;
    gap: 0.375rem;
    padding: var(--quipu-relleno-tarjeta);
    border-radius: var(--quipu-radio);
    background: var(--quipu-piedra);
  }
  .document {
    font-weight: var(--quipu-peso-enfasis);
    font-variant-numeric: tabular-nums;
  }
  .debts {
    display: grid;
    gap: var(--quipu-franja);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .debts li {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 0.25rem 1rem;
    padding: var(--quipu-relleno-tarjeta);
    border-radius: var(--quipu-radio);
    background: var(--quipu-rojo-fondo);
    color: var(--quipu-rojo-texto);
  }
  .debts .total {
    background: var(--quipu-piedra);
    color: var(--quipu-tinta);
    font-weight: var(--quipu-peso-enfasis);
  }
  .amount {
    font-variant-numeric: tabular-nums;
  }
`;
