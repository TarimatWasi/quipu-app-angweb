/** What only A3.2 needs on top of the guest page layout. */
export const GUEST_DETAIL_STYLES = `
  .layout.single {
    grid-template-columns: minmax(0, 40rem);
  }
  .section-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px 24px;
    margin-bottom: 14px;
  }
  .section-head h2 {
    margin: 0;
  }
  .stays {
    display: grid;
    gap: 3px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .stays li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px 20px;
    padding: 16px 20px;
    border-radius: 4px;
    background: #f4f1ea;
  }
  .when {
    flex: 1 1 220px;
    min-width: 0;
  }
  .when strong {
    display: block;
    font-size: 17px;
  }
  .sub {
    font-size: 14px;
    color: var(--mat-sys-on-surface-variant);
  }
  .amount {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .acts {
    display: flex;
    flex-wrap: wrap;
    gap: 0 20px;
  }
  .acts a {
    display: inline-flex;
    align-items: center;
    height: 44px;
    font-weight: 700;
    text-underline-offset: 4px;
  }
  .box {
    padding: 32px 20px;
    border-radius: 4px;
    text-align: center;
    background: #f4f1ea;
  }
  .box p {
    margin: 0 auto 8px;
    max-width: 520px;
    line-height: 1.5;
  }
  .box .strong {
    font-size: 18px;
    font-weight: 700;
  }
  .more {
    margin-top: 12px;
  }
  .action {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0 10px;
    margin: 20px 0 0;
  }
  .action a {
    display: inline-flex;
    align-items: center;
    height: 44px;
    font-weight: 700;
  }
  .action span {
    font-size: 14px;
    color: var(--mat-sys-on-surface-variant);
  }
  .layout-gap {
    margin-top: 32px;
  }
  .sk-panel {
    height: 132px;
    margin-top: 28px;
  }
  .sk-main {
    height: 420px;
    background: #f4f1ea;
  }
  .sk-side {
    height: 360px;
  }
`;
