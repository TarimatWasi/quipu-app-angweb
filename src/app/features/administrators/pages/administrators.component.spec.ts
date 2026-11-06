import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { fireEvent, screen, within } from '@testing-library/dom';
import { formatLimaToday } from '@shared/ui/page-header/lima-today';
import { SKELETON_TIMING } from '@shared/ui/skeleton/skeleton.component';
import { TOAST_DURATION_MS } from '@shared/ui/toast/toast.component';
import type { AdministratorSummary } from '../model/administrator';
import { AdministratorsComponent } from './administrators.component';
import { ToastService } from '@shared/ui/toast/toast.service';

const LIST_URL = '/bff/admin/administrators';

function admin(overrides: Partial<AdministratorSummary>): AdministratorSummary {
  return {
    id: 'a1',
    name: 'Rosa Quispe',
    documentType: 'DNI',
    documentNumber: '*****001',
    email: 'rosa@example.com',
    status: 'ACTIVE',
    createdAt: '2026-01-15T14:00:00Z',
    self: false,
    ...overrides,
  };
}

const ROSA = admin({ id: 'a1', self: true });
const JULIO = admin({
  id: 'a2',
  name: 'Julio Mamani',
  documentType: 'CE',
  documentNumber: '******654',
  email: 'julio@example.com',
  createdAt: '2026-03-02T16:30:00Z',
});
const CARMEN = admin({
  id: 'a3',
  name: 'Carmen Huanca',
  documentType: 'PASSPORT',
  documentNumber: '******123',
  email: 'carmen@example.com',
  status: 'INACTIVE',
  createdAt: '2026-05-20T15:00:00Z',
});
const PENDING = admin({
  id: 'a4',
  name: null,
  documentNumber: '*****912',
  email: 'nuevo@example.com',
  createdAt: new Date().toISOString(),
});
const FOUR = [ROSA, JULIO, CARMEN, PENDING];

async function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: SKELETON_TIMING, useValue: { showAfterMs: 0, slowNoticeAfterMs: 60_000 } },
      { provide: TOAST_DURATION_MS, useValue: 60_000 },
    ],
  });
  const backend = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(AdministratorsComponent);
  const root = fixture.nativeElement as HTMLElement;
  // Not whenStable(): a request still waiting for its answer keeps the app unstable on purpose.
  const stable = async () => {
    TestBed.tick();
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
  };
  await stable();
  const answerList = async (body: AdministratorSummary[]) => {
    await vi.waitFor(() => {
      backend.expectOne((req) => req.method === 'GET' && req.url === LIST_URL).flush(body);
    });
    await stable();
  };
  const failList = async () => {
    await vi.waitFor(() => {
      backend
        .expectOne((req) => req.method === 'GET' && req.url === LIST_URL)
        .flush({ code: 'UNEXPECTED_ERROR', message: 'x' }, { status: 500, statusText: 'Error' });
    });
    await stable();
  };
  const table = () => within(root.querySelector<HTMLElement>('table') ?? root);
  const cards = () => within(root.querySelector<HTMLElement>('ul.cards') ?? root);
  const click = async (element: HTMLElement) => {
    fireEvent.click(element);
    await stable();
  };
  const type = async (label: string, value: string) => {
    fireEvent.input(within(screen.getByRole('dialog')).getByLabelText(label), {
      target: { value },
    });
    await stable();
  };
  const toast = () => TestBed.inject(ToastService).current()?.text ?? '';
  return { fixture, root, backend, stable, answerList, failList, table, cards, click, type, toast };
}

describe('AdministratorsComponent (A7)', () => {
  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
    TestBed.inject(HttpTestingController).verify();
  });

  it('shows the title and the day in Lima at once, and the skeleton while the list is read', async () => {
    const { root, answerList } = await setup();

    expect(root.querySelector('h1')?.textContent.trim()).toBe('Administradores');
    expect(root.querySelector('.today')?.textContent.trim()).toBe(formatLimaToday(new Date()));
    expect(within(root).getByLabelText('Cargando Administradores').getAttribute('aria-busy')).toBe(
      'true',
    );
    expect(root.querySelector('table')?.closest('[aria-hidden="true"]')).toBeTruthy();

    await answerList(FOUR);
    expect(root.querySelector('app-skeleton')).toBeNull();
  });

  it('tells a failed read with «Reintentar», which reads the list again', async () => {
    const { root, failList, answerList, click } = await setup();
    await failList();

    const alert = within(root).getByRole('alert');
    expect(alert.textContent).toContain('No se pudo cargar la lista de administradores.');
    expect(root.textContent).not.toContain('x');
    await click(within(alert).getByRole('button', { name: 'Reintentar' }));
    expect(within(root).getByRole('button', { name: 'Cargando…' })).toBeTruthy();

    await answerList(FOUR);
    expect(within(root).queryByRole('alert')).toBeNull();
    expect(root.querySelector('table')).not.toBeNull();
  });

  it('lists everyone in the table: names, «Tú», «Sin activar», documents, states, dates and actions', async () => {
    const { answerList, table } = await setup();
    await answerList(FOUR);

    expect(
      table()
        .getAllByRole('columnheader')
        .map((th) => th.textContent.trim()),
    ).toEqual(['Nombre', 'Documento', 'Correo de su cuenta', 'Estado', 'Desde', 'Acción']);
    const rows = table()
      .getAllByRole('row')
      .slice(1)
      .map((row) =>
        Array.from(row.children).map((cell) => cell.textContent.replace(/\s+/g, ' ').trim()),
      );
    expect(rows).toEqual([
      ['Rosa Quispe Tú', 'DNI *****001', 'rosa@example.com', 'Activo', '15 ene 2026', ''],
      ['Julio Mamani', 'CE ******654', 'julio@example.com', 'Activo', '2 mar 2026', 'Desactivar'],
      [
        'Carmen Huanca',
        'Pasaporte ******123',
        'carmen@example.com',
        'Inactivo',
        '20 may 2026',
        'Reactivar',
      ],
      ['Sin activar', 'DNI *****912', 'nuevo@example.com', 'Sin activar', 'hoy', 'Desactivar'],
    ]);
    expect(table().getByText('Tú').classList.contains('you')).toBe(true);
    expect(table().getAllByText('Sin activar')[0]?.classList.contains('quipu-unnamed')).toBe(true);
    const badges = Array.from(document.querySelectorAll('table app-status-badge'));
    expect(badges.map((badge) => badge.className)).toEqual([
      'tone-paid',
      'tone-paid',
      'tone-unpaid',
      'tone-review',
    ]);
  });

  it('has the same administrators as cards for a phone, the action at full width', async () => {
    const { answerList, cards } = await setup();
    await answerList(FOUR);

    const items = cards().getAllByRole('listitem', { hidden: true });
    expect(items).toHaveLength(4);
    const lines = (item: Element | undefined) =>
      Array.from(item?.querySelectorAll('p') ?? []).map((p) =>
        p.textContent.replace(/\s+/g, ' ').trim(),
      );
    expect(lines(items[0])).toEqual([
      'Rosa Quispe Tú',
      'DNI *****001 · rosa@example.com',
      'ActivoDesde 15 ene 2026',
    ]);
    expect(lines(items[3])[0]).toBe('Sin activar');
    expect(within(items[0] ?? document.body).queryByRole('button', { hidden: true })).toBeNull();
    expect(
      within(items[2] ?? document.body).getByRole('button', {
        name: 'Reactivar a Carmen Huanca',
        hidden: true,
      }),
    ).toBeTruthy();
  });

  it('says whose account is not activated yet, and counts the accounts', async () => {
    const { root, answerList } = await setup();
    await answerList(FOUR);

    const pending = within(root.querySelector<HTMLElement>('app-pending-summary') ?? root);
    expect(pending.getByRole('heading', { level: 2 }).textContent.trim()).toBe('Lo que toca ahora');
    expect(pending.getByText('1 sin activar').classList.contains('figure')).toBe(true);
    expect(pending.getByText('nuevo@example.com aún no activa su cuenta')).toBeTruthy();
    expect(root.querySelector('.count')?.textContent.trim()).toBe(
      '4 de 5 administradores · 3 activos',
    );
    expect(root.querySelector('.footer')?.textContent.trim()).toBe(
      'Todos los administradores pueden lo mismo. Cada alta, baja o reactivación se avisa por correo a los demás administradores activos.',
    );
  });

  it('says nothing is pending when every account is active', async () => {
    const { root, answerList } = await setup();
    await answerList([ROSA, JULIO]);

    const pending = root.querySelector('app-pending-summary')?.textContent ?? '';
    expect(pending).toContain('2 activos');
    expect(pending).toContain('Nada pendiente');
    expect(pending).toContain('Todas las cuentas creadas ya están activas.');
  });

  it('offers «Nuevo administrador» while there is room, with its help', async () => {
    const { root, answerList } = await setup();
    await answerList(FOUR);

    const button = within(root).getByRole('button', { name: 'Nuevo administrador' });
    expect(button.hasAttribute('disabled')).toBe(false);
    expect(button.getAttribute('aria-describedby')).toBe('new-administrator-help');
    expect(document.getElementById('new-administrator-help')?.textContent.trim()).toBe(
      'Puedes tener hasta 5.',
    );
  });

  it('disables it with five active ones (a pending one counts, an inactive one does not)', async () => {
    const { root, answerList, click } = await setup();
    const five = [ROSA, JULIO, PENDING, admin({ id: 'a5' }), admin({ id: 'a6' }), CARMEN];
    await answerList(five);

    const button = within(root).getByRole('button', { name: 'Nuevo administrador' });
    expect(button.hasAttribute('disabled')).toBe(true);
    expect(document.getElementById('new-administrator-help')?.textContent.trim()).toBe(
      'Ya hay 5, el máximo. Desactiva uno para crear otro.',
    );
    await click(button);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('AdministratorsComponent (A7) changes', () => {
  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
    TestBed.inject(HttpTestingController).verify();
  });

  async function createOne(emailSent: boolean, before: AdministratorSummary[] = FOUR) {
    const page = await setup();
    await page.answerList(before);
    // As a person does: the button has the focus, so the dialog gives it back there.
    const opener = within(page.root).getByRole('button', { name: 'Nuevo administrador' });
    opener.focus();
    await page.click(opener);
    await page.type('Número de documento', '12345678');
    await page.type('Correo de su cuenta', 'otro@example.com');
    await page.type('Tu contraseña', 'Quipu2026');
    await page.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Crear administrador' }),
    );
    const post = await vi.waitFor(() =>
      page.backend.expectOne((req) => req.method === 'POST' && req.url === LIST_URL),
    );
    expect(post.request.body).toEqual({
      documentType: 'DNI',
      documentNumber: '12345678',
      email: 'otro@example.com',
      currentPassword: 'Quipu2026',
    });
    post.flush({ id: 'a9', emailSent }, { status: 201, statusText: 'Created' });
    await page.answerList([...before, admin({ id: 'a9', name: null, email: 'otro@example.com' })]);
    return page;
  }

  it('takes the focus to the count when the new one fills the 5th place and «Nuevo» turns disabled', async () => {
    const { root } = await createOne(true, [ROSA, JULIO, PENDING, admin({ id: 'a5' }), CARMEN]);

    const count = root.querySelector<HTMLElement>('.count');
    expect(count?.textContent.trim()).toBe('6 administradores · 5 de 5 activos');
    expect(
      within(root).getByRole('button', { name: 'Nuevo administrador' }).hasAttribute('disabled'),
    ).toBe(true);
    await vi.waitFor(() => {
      expect(document.activeElement).toBe(count);
    });
    expect(count?.getAttribute('tabindex')).toBe('-1');
  });

  it('leaves the focus on «Nuevo administrador» while there is still room', async () => {
    const { root } = await createOne(true);

    const button = within(root).getByRole('button', { name: 'Nuevo administrador' });
    await vi.waitFor(() => {
      expect(document.activeElement).toBe(button);
    });
    expect(button.hasAttribute('disabled')).toBe(false);
  });

  it('creates, reads the list again and says so with a toast', async () => {
    const { root, toast } = await createOne(true);

    await vi.waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    expect(toast()).toBe('Administrador creado. Le enviamos el enlace a su correo.');
    expect(root.querySelector('.count')?.textContent.trim()).toBe(
      '5 de 5 administradores · 4 activos',
    );
    expect(root.querySelector('app-page-notice.unsent')).toBeNull();
  });

  it('keeps a yellow notice instead of the toast when the link could not be emailed', async () => {
    const { root, toast } = await createOne(false);

    const notice = root.querySelector('app-page-notice.unsent');
    expect(notice?.classList.contains('quipu-notice--info')).toBe(true);
    expect(notice?.querySelector('strong')?.textContent.trim()).toBe(
      'Creamos la cuenta, pero no pudimos enviar el correo.',
    );
    expect(notice?.textContent).toContain(
      'Pídele que entre a «¿Olvidaste tu contraseña?» con otro@example.com: le llegará el enlace para activar su cuenta.',
    );
    expect(toast()).toBe('');
  });

  it.each([
    [
      'Desactivar a Julio Mamani',
      '¿Desactivar a Julio Mamani?',
      'a2/deactivate',
      'Desactivar',
      'Administrador desactivado.',
    ],
    [
      'Reactivar a Carmen Huanca',
      '¿Reactivar a Carmen Huanca?',
      'a3/reactivate',
      'Reactivar',
      'Administrador reactivado.',
    ],
    [
      'Desactivar a nuevo@example.com',
      '¿Desactivar a nuevo@example.com?',
      'a4/deactivate',
      'Desactivar',
      'Administrador desactivado.',
    ],
  ])(
    '«%s» asks the password, calls the BFF, reads the list again and toasts',
    async (action, title, path, confirm, done) => {
      const { root, answerList, failList, backend, click, type, toast, table } = await setup();
      await answerList(FOUR);

      await click(table().getByRole('button', { name: action }));
      const dialog = screen.getByRole('dialog', { name: title });
      await type('Tu contraseña', 'Quipu2026');
      await click(within(dialog).getByRole('button', { name: confirm }));

      const post = await vi.waitFor(() => backend.expectOne(`${LIST_URL}/${path}`));
      expect(post.request.method).toBe('POST');
      expect(post.request.body).toEqual({ currentPassword: 'Quipu2026' });
      post.flush(null, { status: 204, statusText: 'No Content' });
      await failList();
      expect(table().getByText('Julio Mamani')).toBeTruthy();
      expect(root.querySelector('app-skeleton')).toBeNull();
      await click(within(root).getByRole('button', { name: 'Reintentar' }));
      expect(
        within(root).getByRole<HTMLButtonElement>('button', { name: 'Cargando\u2026' }).disabled,
      ).toBe(true);
      await answerList(FOUR);

      await vi.waitFor(() => {
        expect(toast()).toBe(done);
      });
      expect(root.querySelector('table')).not.toBeNull();
    },
  );

  it('changes nothing when the dialog is cancelled', async () => {
    const { answerList, backend, click, table, toast } = await setup();
    await answerList(FOUR);

    await click(table().getByRole('button', { name: 'Desactivar a Julio Mamani' }));
    await click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));

    await vi.waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    backend.expectNone(() => true);
    expect(toast()).toBe('');
  });
});
