import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { formatLimaToday } from './lima-today';
import { PageHeaderComponent } from './page-header.component';

describe('formatLimaToday (P-02)', () => {
  it('says the day in Lima, not in UTC: 03:00 UTC of the 30th is still the 29th in Lima', () => {
    expect(formatLimaToday(new Date('2026-10-30T03:00:00Z'))).toBe('Hoy, jueves 29 de octubre');
  });

  it('turns to the next day at midnight in Lima (05:00 UTC)', () => {
    expect(formatLimaToday(new Date('2026-10-30T05:00:00Z'))).toBe('Hoy, viernes 30 de octubre');
  });
});

describe('PageHeaderComponent (P-02)', () => {
  it('shows the h1 and the day in Lima, without «Volver a …» on a top screen', async () => {
    await render(PageHeaderComponent, {
      inputs: { heading: 'Pagos', date: new Date('2026-10-29T15:00:00Z') },
      providers: [provideRouter([])],
    });

    expect(screen.getByRole('heading', { level: 1, name: 'Pagos' })).toBeTruthy();
    expect(screen.getByText('Hoy, jueves 29 de octubre')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('on a child screen links back to its parent above the h1', async () => {
    const { container } = await render(PageHeaderComponent, {
      inputs: {
        heading: 'Ana Quispe',
        date: new Date('2026-10-29T15:00:00Z'),
        backLink: '/admin/guests',
        backTo: 'Huéspedes',
      },
      providers: [provideRouter([])],
    });

    const back = screen.getByRole('link', { name: 'Volver a Huéspedes' });
    expect(back.getAttribute('href')).toBe('/admin/guests');
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(back.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelector('a svg')?.getAttribute('aria-hidden')).toBe('true');
  });
});
