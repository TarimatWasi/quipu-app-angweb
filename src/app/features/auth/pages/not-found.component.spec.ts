import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { within } from '@testing-library/dom';
import { firstValueFrom } from 'rxjs';
import { AuthService, GuestType, Role } from '@core/auth/auth.service';
import { NotFoundComponent, NotFoundReason } from './not-found.component';

interface SessionAnswer {
  role: Role;
  guestType?: GuestType;
}

const ADMIN: SessionAnswer = { role: 'ADMIN' };
const CONTRACT: SessionAnswer = { role: 'GUEST', guestType: 'CONTRACT' };
const TEMPORARY: SessionAnswer = { role: 'GUEST', guestType: 'TEMPORARY' };

const NOT_FOUND_TEXT =
  'Puede que el enlace esté mal escrito o que la página ya no exista. Lo que buscas está en las secciones de arriba.';
const GUEST_NO_ACCESS_TEXT =
  'Desde tu cuenta puedes ver tu estado de cuenta, tu contrato, tus pagos y tus datos.';
const TEMPORARY_NO_ACCESS_TEXT = 'Desde tu cuenta puedes ver tu estado de pago y tus datos.';

async function setup(session: SessionAnswer | null, reason?: NotFoundReason) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { data: reason === undefined ? {} : { reason } } },
      },
    ],
  });
  if (session) {
    const login = firstValueFrom(
      TestBed.inject(AuthService).login({
        documentType: 'DNI',
        documentNumber: '12345678',
        password: 'secret-1',
      }),
    );
    TestBed.inject(HttpTestingController)
      .expectOne((req) => req.url.endsWith('/bff/auth/login'))
      .flush({ ...session, name: 'Ana Quispe', mustChangePassword: false });
    await login;
  }
  const fixture = TestBed.createComponent(NotFoundComponent);
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  return { root, ui: within(root) };
}

/** The texts of the page in the order they are read: antetítulo, h1, text and the link. */
function reading(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll('p, h1, a')).map((element) => element.textContent.trim());
}

describe('NotFoundComponent (A0.7)', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  describe('a page that does not exist', () => {
    it('sends the administrator to its home', async () => {
      const { root, ui } = await setup(ADMIN);

      expect(ui.getByRole('heading', { level: 1 }).textContent.trim()).toBe(
        'No encontramos esta página',
      );
      expect(reading(root)).toEqual([
        'Página no encontrada',
        'No encontramos esta página',
        NOT_FOUND_TEXT,
        'Ir al inicio',
      ]);
      expect(ui.getByRole('link', { name: 'Ir al inicio' }).getAttribute('href')).toBe('/home');
    });

    it('sends a guest with a contract to its account statement', async () => {
      const { ui } = await setup(CONTRACT);

      const link = ui.getByRole('link', { name: 'Ir a mi estado de cuenta' });
      expect(link.getAttribute('href')).toBe('/home');
      expect(ui.queryByRole('link', { name: 'Ir al inicio' })).toBeNull();
    });

    it('sends a temporary guest, who has no contract, to its payment status', async () => {
      const { ui } = await setup(TEMPORARY);

      expect(ui.getAllByRole('link').map((link) => link.textContent.trim())).toEqual([
        'Ir a mi estado de pago',
      ]);
      expect(ui.getByRole('link').getAttribute('href')).toBe('/home');
    });

    it('sends someone without a session to the login', async () => {
      const { root, ui } = await setup(null);

      expect(reading(root)).toEqual([
        'Página no encontrada',
        'No encontramos esta página',
        NOT_FOUND_TEXT,
        'Ir a iniciar sesión',
      ]);
      expect(ui.getByRole('link', { name: 'Ir a iniciar sesión' }).getAttribute('href')).toBe(
        '/login',
      );
    });

    it('looks like the primary button of the kit (P-10)', async () => {
      const { ui } = await setup(ADMIN);

      const link = ui.getByRole('link', { name: 'Ir al inicio' });
      expect(link.classList).toContain('quipu-button');
      expect(link.classList).toContain('quipu-button--primary');
      expect(ui.getByText('Página no encontrada').classList).toContain('quipu-eyebrow');
    });
  });

  describe('«Sin acceso»', () => {
    it.each([
      ['a guest with a contract', CONTRACT, GUEST_NO_ACCESS_TEXT, 'Ir a mi estado de cuenta'],
      ['a temporary guest', TEMPORARY, TEMPORARY_NO_ACCESS_TEXT, 'Ir a mi estado de pago'],
    ])(
      'tells %s what its account has, without naming other sections',
      async (_, session, text, label) => {
        const { root, ui } = await setup(session, 'no-access');

        expect(reading(root)).toEqual([
          'Sin acceso',
          'Esta página no es para tu cuenta',
          text,
          label,
        ]);
        expect(ui.getByRole('link').getAttribute('href')).toBe('/home');
        expect(root.textContent).not.toMatch(/Pagos de|Huéspedes|Administra/);
      },
    );

    it('falls back to the text of «no existe» for the administrator', async () => {
      const { root, ui } = await setup(ADMIN, 'no-access');

      expect(reading(root)).toEqual([
        'Sin acceso',
        'Esta página no es para tu cuenta',
        NOT_FOUND_TEXT,
        'Ir al inicio',
      ]);
      expect(ui.getByRole('link').getAttribute('href')).toBe('/home');
    });
  });
});
