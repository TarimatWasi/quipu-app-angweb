/** What the forms of A3.5 need on top of the guest page layout (canvas "Estadía"). */
export const GUEST_FORM_STYLES = `
  .layout > * { min-width: 0; }
  .layout > form {
    order: 1;
    max-width: 680px;
  }
  .layout > aside {
    order: 2;
  }
  .fields {
    display: grid;
    gap: 22px;
  }
  .field {
    display: grid;
    gap: 6px;
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
  }
  .field label,
  .field legend {
    padding: 0;
    font-size: 14px;
    font-weight: 700;
    color: var(--mat-sys-on-surface-variant);
  }
  .dates {
    display: grid;
    gap: 16px;
    grid-template-columns: repeat(auto-fit, minmax(160px, 220px));
  }
  .control {
    box-sizing: border-box;
    width: 100%;
    max-width: 320px;
    height: 48px;
    padding: 0 14px;
    border: 1px solid var(--quipu-borde);
    border-radius: 4px;
    /* Only the color: the shorthand would erase the P-07 arrow of the select (styles.scss). */
    background-color: var(--quipu-alpaca);
    color: var(--quipu-tinta);
    font: inherit;
    font-size: 16px;
    font-variant-numeric: tabular-nums;
  }
  .control[aria-invalid='true'] {
    border: 2px solid var(--quipu-error);
  }
  .money {
    position: relative;
    display: block;
    max-width: 240px;
  }
  .money span {
    position: absolute;
    left: 14px;
    top: 13px;
    font-weight: 700;
    color: var(--mat-sys-on-surface-variant);
  }
  .money .control {
    padding-left: 44px;
  }
  .error {
    font-size: 15px;
    color: var(--quipu-error);
  }
  .help {
    font-size: 14px;
    line-height: 1.5;
    color: var(--mat-sys-on-surface-variant);
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
  }
  .chips button {
    height: 44px;
    padding: 0 20px;
    border: 0;
    border-radius: 4px;
    background: var(--quipu-piedra-oscura);
    color: var(--quipu-tinta);
    font: inherit;
    font-weight: 800;
    cursor: pointer;
  }
  .chips button[aria-pressed='true'] {
    background: var(--quipu-obsidiana);
    color: var(--quipu-alpaca);
  }
  .submit {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px 20px;
    margin-top: 28px;
  }
  .submit a {
    padding: 10px 0;
    font-weight: 700;
    text-underline-offset: 4px;
  }
  .notice.first {
    margin: 0 0 24px;
  }
`;
