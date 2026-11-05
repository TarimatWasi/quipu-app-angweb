import { render, screen } from '@testing-library/angular';
import { PageNoticeComponent } from './page-notice.component';

describe('PageNoticeComponent (P-09)', () => {
  it('the red one asks to correct something and is announced at once (T1 «Rechazado»)', async () => {
    await render(
      `<app-page-notice tone="error" heading="Tu pago no se aprobó.">
        Motivo: la imagen no se lee.
        <a noticeAction href="/temporary-guest/payment">Corregir pago</a>
      </app-page-notice>`,
      { imports: [PageNoticeComponent] },
    );

    const alert = screen.getByRole('alert');
    expect(alert.classList).toContain('quipu-notice--error');
    expect(alert.querySelector('strong')?.textContent).toBe('Tu pago no se aprobó.');
    expect(alert.textContent).toContain('Motivo: la imagen no se lee.');
    expect(screen.getByRole('link', { name: 'Corregir pago' }).closest('.action')).toBeTruthy();
  });

  it('the yellow one informs without interrupting (T1 «sobra por devolver»)', async () => {
    const { container } = await render(
      `<app-page-notice heading="Te devolveremos S/ 30.00.">La administración te devolverá la diferencia.</app-page-notice>`,
      { imports: [PageNoticeComponent] },
    );

    const notice = container.querySelector('app-page-notice');
    expect(notice?.classList).toContain('quipu-notice--info');
    expect(notice?.getAttribute('role')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(notice?.querySelector('strong')?.textContent).toBe('Te devolveremos S/ 30.00.');
  });

  it('without a key phrase there is no empty bold', async () => {
    const { container } = await render(
      `<app-page-notice>El servidor está despertando.</app-page-notice>`,
      { imports: [PageNoticeComponent] },
    );

    expect(container.querySelector('strong')).toBeNull();
  });
});
