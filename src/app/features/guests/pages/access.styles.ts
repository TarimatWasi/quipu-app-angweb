/**
 * What A3.7 adds to the shared layout: the countdown of «Lo que toca ahora» (the panel is the
 * kit's), the alpaca boxes of the link, the password and the message, and the rows of buttons.
 */
export const ACCESS_STYLES = `
  .now {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.75rem 2rem;
  }
  .clock,
  .context {
    grid-column: 1;
  }
  .now-action {
    grid-column: 2;
    grid-row: 1 / span 2;
  }
  .clock {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0 0.75rem;
  }
  .countdown {
    font: var(--mat-sys-display-medium);
    font-variant-numeric: tabular-nums;
  }
  .clock-label {
    font: var(--mat-sys-title-medium);
  }
  .expired .countdown {
    color: var(--quipu-error);
  }
  .context {
    color: var(--quipu-tinta-secundaria);
  }
  .box {
    padding: var(--quipu-relleno-tarjeta);
    border-radius: var(--quipu-radio);
    background: var(--quipu-alpaca);
  }
  .secret-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
  }
  .secret {
    flex: 1 1 18rem;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.25rem 1rem;
    min-width: 0;
  }
  .link {
    font: var(--mat-sys-body-large);
    overflow-wrap: anywhere;
  }
  .password {
    font: var(--mat-sys-headline-small);
    font-size: var(--quipu-cifra-resumen);
    letter-spacing: var(--quipu-clave-tracking);
    font-variant-numeric: tabular-nums;
  }
  .section-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem 1.5rem;
  }
  .message {
    font-size: var(--quipu-texto-intro-size);
    line-height: var(--quipu-mensaje-interlineado);
    white-space: pre-line;
    overflow-wrap: anywhere;
  }
  .nothing {
    display: grid;
    gap: 1.5rem;
    max-width: var(--quipu-columna-formulario);
    margin-top: 2rem;
  }
  @media (max-width: 599.98px) {
    .now {
      grid-template-columns: minmax(0, 1fr);
    }
    .now-action {
      grid-column: 1;
      grid-row: auto;
    }
    .now-action .quipu-button {
      width: 100%;
    }
    .countdown {
      font-size: var(--mat-sys-headline-medium-size);
    }
    .secret-row,
    .section-head {
      display: grid;
    }
  }
`;
