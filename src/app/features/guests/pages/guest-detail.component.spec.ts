import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { within } from '@testing-library/dom';
import { NEVER, of, throwError } from 'rxjs';
import {
  squash,
  linkReading,
  words,
  httpError,
  guestOf,
  stayOf,
  setup,
} from './guest-detail.testing';

describe('GuestDetailComponent (A3.2 «Detalle del huésped»)', () => {
  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
  });

  it('shows the header, the panel, the months, the facts, the contract and the actions', async () => {
    const ui = await setup();

    expect(ui.page().getByRole('heading', { level: 1, name: 'Luis Huamán' })).toBeTruthy();
    expect(ui.page().getByRole('link', { name: 'Volver a Huéspedes' }).getAttribute('href')).toBe(
      '/admin/guests',
    );
    expect(ui.service.accountStatus).toHaveBeenCalledWith('g1');
    expect(ui.service.allStays).not.toHaveBeenCalled();
    const now = within(ui.panel());
    expect(squash(ui.panel().querySelector('.figure')?.textContent)).toBe('S/ 800.00');
    expect(now.getByText('por pagar')).toBeTruthy();
    expect(now.getByText(/^Octubre 2026: venció el 5 oct y su pago fue rechazado/)).toBeTruthy();
    expect(now.getByRole('link', { name: 'Corregir pago' }).getAttribute('href')).toBe(
      '/admin/payments/p10',
    );
    expect(ui.facts('Sus datos')).toEqual([
      ['Documento', 'DNI 70412233'],
      ['Estado', 'Activo'],
      ['Tipo', 'Con contrato'],
      ['Teléfono', '987 654 321'],
      ['Correo', 'luis@example.com'],
      ['Contacto de emergencia', 'Sin registrar'],
    ]);
    expect(
      ui
        .page()
        .getByText(
          'Sus datos de contacto los cambia el huésped desde Mis datos; el correo también puedes cambiarlo tú.',
        ),
    ).toBeTruthy();
    expect(ui.facts('Contrato')).toEqual([
      ['Ambiente', 'Habitación 201'],
      ['Estado', 'Activo'],
      ['Cuota', 'S/ 800.00'],
      ['Día de pago', '5 de cada mes'],
      ['Vigencia', '1 jul 2026 – 30 jun 2027'],
    ]);
    const contractBadge = ui
      .page()
      .getByRole('region', { name: 'Contrato' })
      .querySelector('app-status-badge');
    expect(contractBadge?.classList.contains('tone-paid')).toBe(true);
    expect(squash(contractBadge?.textContent)).toBe('Activo');
    expect(ui.page().getByRole('link', { name: 'Ver contrato' }).getAttribute('href')).toMatch(
      /^\/admin\/contracts\/.+/,
    );
    expect(ui.page().queryByRole('region', { name: 'Su registro' })).toBeNull();
    expect(ui.more()).toEqual([
      'Generar otro acceso si olvidó su contraseña',
      'Cambiar correo al que llega la recuperación de contraseña',
      'Ver documentos 2 documentos',
      'Desactivar huésped',
    ]);
  });

  it('lists the months by state, filters them by tile or segment and sorts them', async () => {
    const ui = await setup();
    const table = () => ui.page().getByRole('table', { name: 'Pagos por mes' });
    const rows = () =>
      [...table().querySelectorAll('tbody tr')].map((row) =>
        [...row.querySelectorAll('th, td')].map((cell) => words(cell)),
      );

    expect(rows()).toEqual([
      [
        'Octubre 2026',
        '5 oct 2026',
        'S/ 800.00',
        'Atrasado Pago rechazado',
        'Corregir pago de Octubre 2026',
      ],
      [
        'Noviembre 2026',
        '5 nov 2026',
        'S/ 800.00',
        'Pendiente de revisión',
        'Revisar pago de Noviembre 2026',
      ],
      [
        'Septiembre 2026',
        '5 sep 2026',
        'S/ 800.00',
        'No pagado',
        'Registrar pago de Septiembre 2026',
      ],
      ['Agosto 2026', '5 ago 2026', 'S/ 800.00', 'Pagado', 'Ver pago de Agosto 2026'],
      ['Julio 2026', '5 jul 2026', 'S/ 800.00', 'Pagado', 'Ver pago de Julio 2026'],
    ]);
    expect(ui.page().getByText('Mostrando 5 de 5 meses')).toBeTruthy();
    const register = linkReading(table(), 'Registrar pago de Septiembre 2026');
    expect(register.getAttribute('href')).toBe('/admin/payments/new?guestId=g1');

    const tiles = within(ui.page().getByRole('group', { name: 'Filtrar meses por estado' }));
    await ui.click(tiles.getByRole('button', { name: /^Pagado/ }));
    expect(rows().map((row) => row[0])).toEqual(['Agosto 2026', 'Julio 2026']);
    expect(ui.page().getByText('Mostrando 2 de 5 meses')).toBeTruthy();
    expect(tiles.getByRole('button', { name: /^Pagado/ }).getAttribute('aria-pressed')).toBe(
      'true',
    );

    await ui.click(ui.page().getByRole('button', { name: 'Mostrar solo Atrasado (1)' }));
    expect(rows().map((row) => row[0])).toEqual(['Octubre 2026']);
    await ui.click(tiles.getByRole('button', { name: /^Todos/ }));
    expect(rows()).toHaveLength(5);

    await ui.click(within(table()).getByRole('button', { name: 'Mes' }));
    expect(rows().map((row) => row[0])).toEqual([
      'Julio 2026',
      'Agosto 2026',
      'Septiembre 2026',
      'Octubre 2026',
      'Noviembre 2026',
    ]);
    expect(table().querySelector('th[aria-sort="ascending"]')?.textContent).toContain('Mes');
    await ui.click(within(table()).getByRole('button', { name: 'Mes' }));
    expect(rows()[0]?.[0]).toBe('Noviembre 2026');
  });

  it('says a contract guest without months has nothing to charge yet, and without contract', async () => {
    const ui = await setup({ detail: of(guestOf({ contract: undefined })), months: [] });

    expect(squash(ui.panel().querySelector('.figure')?.textContent)).toBe('Sin contrato');
    expect(
      within(ui.panel()).getByRole('link', { name: 'Cargar contrato' }).getAttribute('href'),
    ).toMatch(/^\/admin\/contracts\/new\?guestId=.+/);
    expect(within(ui.panel()).queryByRole('button')).toBeNull();
    const empty = ui.page().getByRole('region', { name: 'Aún no tiene meses por cobrar.' });
    expect(squash(empty.textContent)).toContain('Aparecen cuando le cargues un contrato.');
    expect(ui.page().queryByRole('region', { name: 'Contrato' })).toBeNull();
  });

  it('shows every stay of a temporary guest with its actions, an old debt included', async () => {
    const ui = await setup({
      detail: of(guestOf({ type: 'TEMPORARY', contract: undefined })),
      stays: [
        stayOf(),
        stayOf({
          id: 's2',
          startDate: '2026-09-01',
          endDate: '2026-09-08',
          paymentStatus: 'PAID',
          paymentId: 'p2',
        }),
        stayOf({
          id: 's3',
          startDate: '2026-08-01',
          endDate: '2026-08-03',
          paymentStatus: 'OVERDUE',
          paymentId: null,
          environmentCode: null,
        }),
      ],
    });

    expect(ui.service.accountStatus).not.toHaveBeenCalled();
    expect(ui.service.allStays).toHaveBeenCalledWith('g1');
    // The oldest stay, owed, comes before the payment under review.
    expect(squash(ui.panel().querySelector('.figure')?.textContent)).toBe('S/ 480.00');
    expect(
      within(ui.panel()).getByText(
        'Estadía del 1 – 3 ago 2026: venció el 3 ago. Si te pagó en persona, regístralo como pago directo.',
      ),
    ).toBeTruthy();
    const section = within(ui.page().getByRole('region', { name: 'Estadías' }));
    expect(section.getByRole('link', { name: 'Registrar estadía' }).getAttribute('href')).toBe(
      '/admin/guests/g1/stays/new',
    );
    const cards = [
      ...section.getByRole('list', { name: 'Estadías' }).querySelectorAll(':scope > li'),
    ].map((card) => words(card));
    expect(cards).toEqual([
      '20 – 31 oct 2026 C1 · 11 noches S/ 480.00 Pendiente de revisión Revisar pago de la estadía del 20 – 31 oct 2026 Corregir estadía del 20 – 31 oct 2026',
      '1 – 8 sep 2026 C1 · 7 noches S/ 480.00 Pagado Ver pago de la estadía del 1 – 8 sep 2026 Corregir estadía del 1 – 8 sep 2026',
      '1 – 3 ago 2026 Sin ambiente · 2 noches S/ 480.00 Atrasado Registrar pago de la estadía del 1 – 3 ago 2026 Corregir estadía del 1 – 3 ago 2026',
    ]);
    expect(
      linkReading(
        ui.page().getByRole('region', { name: 'Estadías' }),
        'Corregir estadía del 1 – 8 sep 2026',
      ).getAttribute('href'),
    ).toBe('/admin/guests/g1/stays/s2');
    expect(
      section.getByText('De la más reciente a la más antigua. Cada estadía tiene un solo pago.'),
    ).toBeTruthy();
  });

  it('follows the clock: an access that expires while the page is open turns «Vencido»', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    try {
      const ui = await setup({
        detail: of(
          guestOf({
            status: 'PENDING_ACTIVATION',
            onboardingProgress: 'NOT_STARTED',
            contract: undefined,
            version: 1,
            accessExpiresAt: new Date(Date.now() + 2 * 60_000).toISOString(),
          }),
        ),
      });
      expect(squash(ui.panel().querySelector('.figure')?.textContent)).toBe('02:00');

      vi.advanceTimersByTime(3 * 60_000);
      await ui.harness.fixture.whenStable();

      expect(squash(ui.panel().querySelector('.figure')?.textContent)).toBe('Vencido');
    } finally {
      vi.useRealTimers();
    }
  });

  it('counts the access down every second while the page is open (TAR-330)', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    try {
      const ui = await setup({
        detail: of(
          guestOf({
            status: 'PENDING_ACTIVATION',
            onboardingProgress: 'NOT_STARTED',
            contract: undefined,
            version: 1,
            accessExpiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
          }),
        ),
      });
      const figure = () => squash(ui.panel().querySelector('.figure')?.textContent);
      expect(figure()).toBe('05:00');

      vi.advanceTimersByTime(1_000);
      await ui.harness.fixture.whenStable();
      expect(figure()).toBe('04:59');

      vi.advanceTimersByTime(59_000);
      await ui.harness.fixture.whenStable();
      expect(figure()).toBe('04:00');
    } finally {
      vi.useRealTimers();
    }
  });

  it('blocks the payments of a guest pending activation and offers its access and document', async () => {
    const ui = await setup({
      detail: of(
        guestOf({
          status: 'PENDING_ACTIVATION',
          onboardingProgress: 'NOT_STARTED',
          name: null,
          phone: null,
          email: null,
          contract: undefined,
          documentCount: 0,
          version: 3,
          accessExpiresAt: new Date(Date.now() + 18 * 60_000).toISOString(),
        }),
      ),
    });

    expect(ui.page().getByRole('heading', { level: 1, name: 'DNI 70412233' })).toBeTruthy();
    expect(ui.service.accountStatus).not.toHaveBeenCalled();
    expect(squash(ui.panel().querySelector('.figure')?.textContent)).toMatch(/^1[78]:\d{2}$/);
    expect(within(ui.panel()).getByRole('button', { name: 'Generar otro acceso' })).toBeTruthy();
    const blocked = ui.page().getByRole('region', { name: 'Contrato y pagos' });
    expect(words(blocked)).toBe(
      'Contrato y pagos Primero tiene que activar su cuenta. Hasta que termine su registro no se le puede cargar un contrato ni registrar pagos.',
    );
    const steps = ui.page().getByRole('list', { name: 'Pasos de su registro' });
    expect([...steps.querySelectorAll('li')].map((li) => squash(li.textContent))).toEqual([
      'Contraseña: Falta',
      'Datos personales: Falta',
      'Documentos: Falta · opcional',
      'Consentimiento: Falta',
    ]);
    expect(
      ui.page().getByText('Su nombre y sus datos los completa el huésped al activar su acceso.'),
    ).toBeTruthy();
    expect(ui.more()).toEqual([
      'Cambiar correo al que llega la recuperación de contraseña',
      'Ver documentos no subió documentos',
      'Corregir documento solo hasta que active su acceso',
      'Desactivar huésped',
    ]);
    expect(ui.page().getByRole('link', { name: 'Corregir documento' }).getAttribute('href')).toBe(
      '/admin/guests/g1/document',
    );
  });

  it('shows the onboarding steps and «Estadías y pagos» for a temporary guest', async () => {
    const ui = await setup({
      detail: of(
        guestOf({
          type: 'TEMPORARY',
          status: 'ONBOARDING',
          onboardingProgress: 'PERSONAL_DATA_SAVED',
          contract: undefined,
        }),
      ),
    });

    expect(squash(ui.panel().querySelector('.figure')?.textContent)).toBe('2 de 4');
    expect(within(ui.panel()).queryByRole('button')).toBeNull();
    expect(ui.service.allStays).not.toHaveBeenCalled();
    expect(
      squash(ui.page().getByRole('region', { name: 'Estadías y pagos' }).textContent),
    ).toContain('Hasta que termine su registro no se le puede registrar una estadía ni pagos.');
    const steps = ui.page().getByRole('list', { name: 'Pasos de su registro' });
    expect([...steps.querySelectorAll('li.done')]).toHaveLength(2);
    expect(ui.more()[0]).toBe('Generar otro acceso');
  });

  it('says when the guest does not exist, under the title «Huésped»', async () => {
    const ui = await setup({
      detail: throwError(() => httpError(404, { code: 'RESOURCE_NOT_FOUND' })),
    });

    expect(ui.page().getByRole('heading', { level: 1, name: 'Huésped' })).toBeTruthy();
    const block = within(ui.page().getByRole('region', { name: 'No encontramos a este huésped.' }));
    expect(block.getByRole('link', { name: 'Volver a Huéspedes' }).getAttribute('href')).toBe(
      '/admin/guests',
    );
    expect(ui.page().queryByRole('region', { name: 'Lo que toca ahora' })).toBeNull();
  });

  it('says the guest could not be loaded and tries again', async () => {
    const ui = await setup({ detail: throwError(() => httpError(503)) });

    expect(squash(ui.page().getByRole('alert').textContent)).toBe(
      'No se pudo cargar el huésped. Reintentar',
    );
    ui.service.get.mockReturnValueOnce(of(guestOf()));
    await ui.click(ui.page().getByRole('button', { name: 'Reintentar' }));
    expect(ui.service.get).toHaveBeenCalledTimes(2);
    expect(ui.page().getByRole('heading', { level: 1, name: 'Luis Huamán' })).toBeTruthy();
  });

  it('is busy with a skeleton while the guest loads', async () => {
    const ui = await setup({ detail: NEVER });

    expect(ui.root().querySelector('[aria-busy="true"]')?.getAttribute('aria-label')).toBe(
      'Cargando el huésped',
    );
    expect(ui.page().getByRole('heading', { level: 1, name: 'Huésped' })).toBeTruthy();
  });
});
