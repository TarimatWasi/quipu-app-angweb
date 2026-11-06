import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { fireEvent, within } from '@testing-library/dom';
import { formatLimaToday } from '@shared/ui/page-header/lima-today';
import { SKELETON_TIMING } from '@shared/ui/skeleton/skeleton.component';
import type { GuestPage, GuestSummary } from '../model/guest-list';
import { GuestsListComponent } from './guests-list.component';

const LIST_URL = '/bff/admin/guests';

function guest(overrides: Partial<GuestSummary>): GuestSummary {
  return {
    id: 'g1',
    documentType: 'DNI',
    documentNumber: '43219087',
    name: 'Rosa Quispe',
    type: 'CONTRACT',
    status: 'ACTIVE',
    hasLoginAccess: true,
    environment: {
      code: '101',
      type: 'ROOM',
      kind: 'CONTRACT',
      startDate: '2026-04-01',
      endDate: '2027-03-31',
    },
    accessExpiresAt: null,
    ...overrides,
  };
}

const ROSA = guest({ id: 'rosa' });
const ANA = guest({
  id: 'ana',
  name: 'Ana Torres',
  documentType: 'CE',
  documentNumber: '001234567',
  type: 'TEMPORARY',
  environment: {
    code: 'C1',
    type: 'CABIN',
    kind: 'STAY',
    startDate: '2026-10-20',
    endDate: '2026-10-31',
  },
});
const EXPIRED = guest({
  id: 'expired',
  name: null,
  documentNumber: '71844520',
  status: 'PENDING_ACTIVATION',
  hasLoginAccess: false,
  environment: null,
  accessExpiresAt: '2020-01-01T15:00:00Z',
});
const LATER = new Date(Date.now() + 3 * 86_400_000).toISOString();
const PENDING = guest({
  id: 'pending',
  name: null,
  documentType: 'PASSPORT',
  documentNumber: '548210',
  type: 'TEMPORARY',
  status: 'PENDING_ACTIVATION',
  hasLoginAccess: false,
  environment: null,
  accessExpiresAt: LATER,
});
const LUIS = guest({ id: 'luis', name: 'Luis Huamán', status: 'ONBOARDING' });

function page(content: GuestSummary[], overrides: Partial<GuestPage> = {}): GuestPage {
  return {
    content,
    nextCursor: null,
    pendingActivationCount: content.filter((g) => g.status === 'PENDING_ACTIVATION').length,
    onboardingCount: content.filter((g) => g.status === 'ONBOARDING').length,
    ...overrides,
  };
}

async function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: SKELETON_TIMING, useValue: { showAfterMs: 0, slowNoticeAfterMs: 60_000 } },
    ],
  });
  const backend = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(GuestsListComponent);
  const root = fixture.nativeElement as HTMLElement;
  const view = within(root);
  // Not whenStable(): a request still waiting for its answer keeps the app unstable on purpose.
  const stable = async () => {
    TestBed.tick();
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
  };
  await stable();
  /** The read on its way: exactly one, a GET of the list. */
  const request = async (): Promise<TestRequest> => {
    let found: TestRequest | undefined;
    await vi.waitFor(() => {
      found = backend.expectOne((req) => req.method === 'GET' && req.url === LIST_URL);
    });
    if (found === undefined) throw new Error('No request of the list');
    return found;
  };
  const params = (req: TestRequest) =>
    Object.fromEntries(req.request.params.keys().map((key) => [key, req.request.params.get(key)]));
  const answer = async (body: GuestPage) => {
    const req = await request();
    req.flush(body);
    await stable();
    return params(req);
  };
  const fail = async () => {
    const req = await request();
    req.flush({ code: 'UNEXPECTED_ERROR', message: 'x' }, { status: 500, statusText: 'Error' });
    await stable();
  };
  const click = async (element: HTMLElement) => {
    fireEvent.click(element);
    await stable();
  };
  const choose = async (label: string, value: string) => {
    const select = view.getByLabelText(label);
    fireEvent.change(select, { target: { value } });
    fireEvent.input(select);
    await stable();
  };
  const search = async (value: string) => {
    fireEvent.input(view.getByLabelText('Buscar'), { target: { value } });
    await stable();
  };
  const table = () => within(root.querySelector<HTMLElement>('table') ?? root);
  const names = () =>
    [...root.querySelectorAll('tbody th')].map((cell) =>
      (cell.querySelector('.quipu-name, .quipu-unnamed')?.textContent ?? '').trim(),
    );
  const count = () => root.querySelector('.quipu-list-count output')?.textContent.trim() ?? '';
  return {
    root,
    view,
    backend,
    stable,
    request,
    answer,
    fail,
    click,
    choose,
    search,
    table,
    names,
    count,
  };
}

describe('GuestsListComponent (A3)', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('shows the title and the day at once, the skeleton while it reads the current guests, 20 at a time', async () => {
    const { root, view, answer } = await setup();

    expect(root.querySelector('h1')?.textContent.trim()).toBe('Huéspedes');
    expect(root.querySelector('.today')?.textContent.trim()).toBe(formatLimaToday(new Date()));
    expect(view.getByLabelText('Cargando Huéspedes').getAttribute('aria-busy')).toBe('true');
    expect(root.querySelector('table')).toBeNull();

    expect(await answer(page([ROSA]))).toEqual({ status: 'CURRENT', limit: '20' });
    expect(view.queryByLabelText('Cargando Huéspedes')).toBeNull();
    expect(view.getByRole('heading', { level: 2, name: 'Todos los huéspedes' })).toBeTruthy();
    const add = view.getByRole('link', { name: 'Nuevo huésped' });
    expect(add.getAttribute('href')).toBe('/admin/guests/new');
    expect(add.classList).toContain('quipu-button--secondary');
    expect(add.closest('.quipu-list-head')?.querySelector('h2')?.textContent.trim()).toBe(
      'Todos los huéspedes',
    );
  });

  it('draws each guest with its document, type, environment, state, access and link', async () => {
    const { table, answer } = await setup();
    await answer(page([ROSA, ANA, EXPIRED, PENDING]));

    const cells = table()
      .getAllByRole('row')
      .slice(1)
      .map((row) =>
        [...row.querySelectorAll('th, td')].map((cell) =>
          [...cell.childNodes]
            .filter((node) => node.nodeType !== Node.COMMENT_NODE)
            .map((node) => (node.textContent ?? '').trim())
            .filter((text) => text !== '')
            .join(' | '),
        ),
      );
    expect(cells).toEqual([
      [
        'Sin nombre | DNI 71844520',
        'Con contrato',
        'Sin ambiente | se asigna con el contrato o la estadía',
        'Pendiente de activación | Acceso vencido',
        'Ver huésped',
      ],
      [
        'Sin nombre | Pasaporte 548210',
        'Temporal',
        'Sin ambiente | se asigna con el contrato o la estadía',
        expect.stringMatching(/^Pendiente de activación \| Acceso vence el .+ a las \d\d:\d\d$/),
        'Ver huésped',
      ],
      [
        'Ana Torres | CE 001234567',
        'Temporal',
        'Cabaña C1 | estadía 20 – 31 oct',
        'Activo',
        'Ver huésped',
      ],
      [
        'Rosa Quispe | DNI 43219087',
        'Con contrato',
        'Habitación 101 | contrato hasta 31 mar 2027',
        'Activo',
        'Ver huésped',
      ],
    ]);
    expect(table().getByText('Acceso vencido').classList).toContain('expired');
    expect(table().getAllByText('Sin nombre')[0]?.classList).toContain('quipu-unnamed');
    const link = table().getByRole('link', { name: 'Ver huésped Ana Torres' });
    expect(link.getAttribute('href')).toBe('/admin/guests/ana');
  });

  it('says what waits in «Lo que toca ahora» and «Ver sin activar» asks only the pending ones', async () => {
    const { root, view, answer, click } = await setup();
    await answer(page([ROSA, LUIS, EXPIRED, PENDING], { pendingActivationCount: 3 }));

    const panel = within(root.querySelector<HTMLElement>('app-guests-now-panel') ?? root);
    expect(panel.getByRole('heading', { name: 'Lo que toca ahora' }).classList).toContain(
      'cdk-visually-hidden',
    );
    expect(panel.getByText('3').classList).toContain('figure');
    expect(panel.getByText('huéspedes sin activar')).toBeTruthy();
    expect(root.querySelector('app-guests-now-panel .text')?.textContent.trim()).toBe(
      'Aún no abren su acceso. Al DNI 71844520 se le venció: genera otro desde su ficha. Además, 1 está completando sus datos. Hasta que terminen no se les puede cargar un contrato ni una estadía.',
    );

    await click(panel.getByRole('button', { name: 'Ver sin activar' }));

    expect(await answer(page([EXPIRED, PENDING], { pendingActivationCount: 3 }))).toEqual({
      status: 'PENDING_ACTIVATION',
      limit: '20',
    });
    expect(view.getByLabelText<HTMLSelectElement>('Estado').value).toBe('PENDING_ACTIVATION');
    expect(view.getByRole('button', { name: 'Quitar filtros' })).toBeTruthy();
  });

  it('has no panel while nobody is pending', async () => {
    const { root, answer } = await setup();
    await answer(page([ROSA, LUIS]));

    expect(root.querySelector('app-guests-now-panel')).toBeNull();
  });

  it('switches to «Inactivos»: asks the BFF, clears the filters and leaves out Estado and the panel', async () => {
    const { root, view, answer, click, search, choose } = await setup();
    await answer(page([ROSA, EXPIRED]));
    await choose('Tipo', 'CONTRACT');
    expect(await answer(page([ROSA, EXPIRED]))).toEqual({
      status: 'CURRENT',
      type: 'CONTRACT',
      limit: '20',
    });
    await search('rosa');

    const group = view.getByRole('group', { name: 'Qué huéspedes ver' });
    const current = within(group).getByRole('button', { name: 'Actuales' });
    const inactive = within(group).getByRole('button', { name: 'Inactivos' });
    expect(current.getAttribute('aria-pressed')).toBe('true');
    expect(inactive.getAttribute('aria-pressed')).toBe('false');

    await click(inactive);

    expect(await answer(page([]))).toEqual({ status: 'INACTIVE', limit: '20' });
    expect(inactive.getAttribute('aria-pressed')).toBe('true');
    expect(current.getAttribute('aria-pressed')).toBe('false');
    expect(view.getByLabelText<HTMLInputElement>('Buscar').value).toBe('');
    expect(view.getByLabelText<HTMLSelectElement>('Tipo').value).toBe('ALL');
    expect(view.queryByLabelText('Estado')).toBeNull();
    expect(root.querySelector('app-guests-now-panel')).toBeNull();
    expect(view.getByRole('heading', { name: 'No hay huéspedes inactivos.' })).toBeTruthy();
    expect(
      view.getByText('Un huésped que desactives aparecerá aquí, con su historial.'),
    ).toBeTruthy();
  });

  it('searches what is loaded without asking the BFF, counts it live and «Quitar filtros» brings all back', async () => {
    const { root, view, backend, answer, search, click, names, count } = await setup();
    await answer(page([ROSA, ANA, EXPIRED]));
    expect(count()).toBe('Mostrando 3 de 3 cargados');
    expect(root.querySelector('.quipu-list-count output')?.getAttribute('aria-live')).toBe(
      'polite',
    );
    expect(view.queryByRole('button', { name: 'Quitar filtros' })).toBeNull();

    await search('cabaña');

    backend.expectNone(() => true);
    expect(names()).toEqual(['Ana Torres']);
    expect(count()).toBe('Mostrando 1 de 3 cargados');

    await click(view.getByRole('button', { name: 'Quitar filtros' }));

    expect(names()).toHaveLength(3);
    expect(count()).toBe('Mostrando 3 de 3 cargados');
    expect(view.getByLabelText<HTMLInputElement>('Buscar').value).toBe('');
  });

  it('says when nothing matches and offers «Quitar filtros» there too', async () => {
    const { root, view, answer, search, click } = await setup();
    await answer(page([ROSA]));

    await search('nadie');

    const empty = within(root.querySelector<HTMLElement>('app-empty-state') ?? root);
    expect(
      empty.getByRole('heading', { name: 'Ningún huésped coincide con los filtros.' }),
    ).toBeTruthy();
    await click(empty.getByRole('button', { name: 'Quitar filtros' }));
    expect(root.querySelector('table tbody tr')).not.toBeNull();
    expect(view.queryByText('Ningún huésped coincide con los filtros.')).toBeNull();
  });

  it('says there are no guests yet and how to start', async () => {
    const { view, answer } = await setup();
    await answer(page([]));

    expect(view.getByRole('heading', { name: 'Aún no hay huéspedes.' })).toBeTruthy();
    expect(
      view.getByText(
        'Registra al primero con su documento: el huésped completa sus datos al activar su acceso.',
      ),
    ).toBeTruthy();
  });

  it('puts the not activated first and sorts by a header, which says its order with aria-sort', async () => {
    const { table, answer, click, names } = await setup();
    await answer(page([ROSA, ANA, LUIS, EXPIRED]));

    expect(names()).toEqual(['Sin nombre', 'Luis Huamán', 'Ana Torres', 'Rosa Quispe']);
    const header = (name: string) => table().getByRole('columnheader', { name: new RegExp(name) });
    expect(header('Estado').getAttribute('aria-sort')).toBe('ascending');
    expect(header('Huésped').hasAttribute('aria-sort')).toBe(false);

    await click(table().getByRole('button', { name: 'Huésped' }));

    expect(header('Huésped').getAttribute('aria-sort')).toBe('ascending');
    expect(header('Estado').hasAttribute('aria-sort')).toBe(false);
    expect(names()).toEqual(['Ana Torres', 'Luis Huamán', 'Rosa Quispe', 'Sin nombre']);
    expect(table().getByRole('button', { name: 'Huésped' }).classList).toContain('active');

    await click(table().getByRole('button', { name: 'Huésped' }));

    expect(header('Huésped').getAttribute('aria-sort')).toBe('descending');
    expect(names()).toEqual(['Sin nombre', 'Rosa Quispe', 'Luis Huamán', 'Ana Torres']);
    expect(header('Huésped').querySelector('svg')?.classList).toContain('down');
  });

  it('sorts on a phone with «Ordenar por»', async () => {
    const { answer, choose, names } = await setup();
    await answer(page([ROSA, ANA, EXPIRED]));

    await choose('Ordenar por', 'environment');

    expect(names()).toEqual(['Rosa Quispe', 'Ana Torres', 'Sin nombre']);
  });

  it('«Mostrar más» asks the next page with the cursor and adds it; it goes away on the last page', async () => {
    const { view, answer, click, names, count } = await setup();
    await answer(page([ROSA], { nextCursor: 'c/2+' }));
    expect(view.queryByText(/^Mostrando .* cargados$/, { selector: 'app-show-more *' })).toBeNull();

    await click(view.getByRole('button', { name: 'Mostrar más' }));

    expect(await answer(page([ANA]))).toEqual({ status: 'CURRENT', limit: '20', after: 'c/2+' });
    expect(names()).toEqual(['Ana Torres', 'Rosa Quispe']);
    expect(count()).toBe('Mostrando 2 de 2 cargados');
    expect(view.queryByRole('button', { name: 'Mostrar más' })).toBeNull();
  });

  it('says the list could not be read and «Reintentar» reads it again', async () => {
    const { view, answer, fail, click, names } = await setup();
    await fail();

    expect(view.getByText('No se pudieron cargar los huéspedes.')).toBeTruthy();
    expect(view.queryByRole('table')).toBeNull();

    await click(view.getByRole('button', { name: 'Reintentar' }));
    expect(view.getByRole('button', { name: 'Cargando…' })).toBeTruthy();

    expect(await answer(page([ROSA]))).toEqual({ status: 'CURRENT', limit: '20' });
    expect(view.queryByText('No se pudieron cargar los huéspedes.')).toBeNull();
    expect(names()).toEqual(['Rosa Quispe']);
  });

  it('keeps what is loaded when the next page fails and retries that page', async () => {
    const { view, answer, fail, click, names } = await setup();
    await answer(page([ROSA], { nextCursor: 'next' }));

    await click(view.getByRole('button', { name: 'Mostrar más' }));
    await fail();

    expect(names()).toEqual(['Rosa Quispe']);
    expect(view.getByText('No se pudieron cargar los huéspedes.')).toBeTruthy();

    await click(view.getByRole('button', { name: 'Reintentar' }));
    expect(await answer(page([ANA]))).toEqual({ status: 'CURRENT', limit: '20', after: 'next' });
    expect(names()).toEqual(['Ana Torres', 'Rosa Quispe']);
  });

  it('forgets the cursor of the previous list while another view loads its first page', async () => {
    const { view, answer, click, names } = await setup();
    await answer(page([ROSA], { nextCursor: 'old' }));
    expect(view.getByRole('button', { name: 'Mostrar más' })).toBeTruthy();

    await click(view.getByRole('button', { name: 'Inactivos' }));

    expect(view.queryByRole('button', { name: 'Mostrar más' })).toBeNull();
    const inactive = guest({ id: 'gone', name: 'Pedro Mamani', status: 'INACTIVE' });
    expect(await answer(page([inactive]))).toEqual({ status: 'INACTIVE', limit: '20' });
    expect(names()).toEqual(['Pedro Mamani']);
  });

  it('after a failure, a new filter forgets it and «Reintentar» never asks the old query', async () => {
    const { view, answer, fail, choose, click, request, stable } = await setup();
    await answer(page([ROSA]));
    await choose('Tipo', 'CONTRACT');
    await fail();
    expect(view.getByText('No se pudieron cargar los huéspedes.')).toBeTruthy();

    await choose('Tipo', 'TEMPORARY');

    expect(view.queryByText('No se pudieron cargar los huéspedes.')).toBeNull();
    const pending = await request();
    expect(pending.request.params.get('type')).toBe('TEMPORARY');
    pending.flush({ code: 'UNEXPECTED_ERROR', message: 'x' }, { status: 500, statusText: 'Error' });
    await stable();
    await click(view.getByRole('button', { name: 'Reintentar' }));
    expect(await answer(page([ANA]))).toEqual({
      status: 'CURRENT',
      type: 'TEMPORARY',
      limit: '20',
    });
  });
});
