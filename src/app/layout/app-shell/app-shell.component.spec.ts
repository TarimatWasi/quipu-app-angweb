import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter, Router } from '@angular/router';
import { fireEvent, screen, within } from '@testing-library/dom';
import { firstValueFrom } from 'rxjs';
import { AuthService, GuestType, Role } from '@core/auth/auth.service';
import { accountEntriesFor, isCurrent, sectionsFor } from './app-nav';
import { AppShellComponent } from './app-shell.component';

const isLogin = (req: HttpRequest<unknown>) => req.url.endsWith('/bff/auth/login');
const isLogout = (req: HttpRequest<unknown>) => req.url.endsWith('/bff/auth/logout');
const isChange = (req: HttpRequest<unknown>) => req.url.endsWith('/bff/auth/change-password');

@Component({ selector: 'app-page-stub', template: '' })
class PageStubComponent {}

const PATHS = [
  'login',
  'home',
  'admin/payments',
  'admin/administrators',
  'guest/payments',
  'guest/payments/new',
  'temporary-guest/payment',
];

interface SessionAnswer {
  role: Role;
  name: string;
  mustChangePassword: boolean;
  guestType?: GuestType;
}

const ADMIN: SessionAnswer = { role: 'ADMIN', name: 'Rosa Quispe', mustChangePassword: false };
const CONTRACT: SessionAnswer = {
  role: 'GUEST',
  name: 'Ana Quispe',
  mustChangePassword: false,
  guestType: 'CONTRACT',
};
const TEMPORARY: SessionAnswer = {
  role: 'GUEST',
  name: 'Diego Rojas',
  mustChangePassword: false,
  guestType: 'TEMPORARY',
};
const NO_SECTIONS: SessionAnswer = { role: 'GUEST', name: 'Luz Mamani', mustChangePassword: false };

async function setup(session: SessionAnswer, url = '/home') {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(PATHS.map((path) => ({ path, component: PageStubComponent }))),
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });
  const auth = TestBed.inject(AuthService);
  const login = firstValueFrom(
    auth.login({ documentType: 'DNI', documentNumber: '12345678', password: 'secret-1' }),
  );
  TestBed.inject(HttpTestingController).expectOne(isLogin).flush(session);
  await login;
  await TestBed.inject(Router).navigateByUrl(url);
  const fixture = TestBed.createComponent(AppShellComponent);
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  return { auth, fixture, root, ui: within(root) };
}

function element(root: HTMLElement, selector: string): HTMLElement {
  const found = root.querySelector<HTMLElement>(selector);
  if (!found) throw new Error(`nothing matches ${selector}`);
  return found;
}

/** The menu of the bar on a wide screen (the phone's panel has its own copy). */
function barNav(root: HTMLElement) {
  const nav = root.querySelector<HTMLElement>('header nav');
  if (!nav) throw new Error('no menu in the bar');
  return within(nav);
}

function sectionTexts(root: HTMLElement): string[] {
  return [...root.querySelectorAll('header nav li')].map((li) => li.textContent.trim());
}

async function openAccount(fixture: ComponentFixture<AppShellComponent>, name: string) {
  const ui = within(fixture.nativeElement as HTMLElement);
  const button = ui.getByRole('button', { name: `Tu cuenta: ${name}` });
  fireEvent.click(button);
  await fixture.whenStable();
  return button;
}

describe('AppShellComponent (P-01)', () => {
  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
    TestBed.inject(HttpTestingController).verify();
  });

  describe('menu by role', () => {
    it('the administrator has Inicio, Ambientes, Huéspedes, Contratos, Pagos and Finanzas; only the ones with a screen are links', async () => {
      const { root } = await setup(ADMIN, '/admin/payments');

      expect(sectionTexts(root)).toEqual([
        'Inicio',
        'Ambientes (pronto)',
        'Huéspedes (pronto)',
        'Contratos (pronto)',
        'Pagos',
        'Finanzas (pronto)',
      ]);
      const nav = barNav(root);
      expect(nav.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
        '/home',
        '/admin/payments',
      ]);
      expect(nav.queryByRole('link', { name: /Ambientes/ })).toBeNull();
    });

    it('marks the current section with aria-current="page" and only that one', async () => {
      const { root } = await setup(ADMIN, '/admin/payments');

      const nav = barNav(root);
      const pagos = nav.getByRole('link', { name: 'Pagos' });
      expect(pagos.getAttribute('aria-current')).toBe('page');
      expect(pagos.classList).toContain('is-current');
      expect(nav.getByRole('link', { name: 'Inicio' }).hasAttribute('aria-current')).toBe(false);
    });

    it('the guest with a contract has Estado de cuenta, Mi contrato, Historial de pagos and Mis datos; a child page keeps its section', async () => {
      const { root } = await setup(CONTRACT, '/guest/payments/new');

      expect(sectionTexts(root)).toEqual([
        'Estado de cuenta',
        'Mi contrato (pronto)',
        'Historial de pagos',
        'Mis datos (pronto)',
      ]);
      const nav = barNav(root);
      expect(
        nav.getByRole('link', { name: 'Historial de pagos' }).getAttribute('aria-current'),
      ).toBe('page');
      expect(nav.getByRole('link', { name: 'Estado de cuenta' }).getAttribute('href')).toBe(
        '/home',
      );
    });

    it('the temporary guest has Estado de pago and Mis datos; sending the payment is part of Estado de pago', async () => {
      const { root } = await setup(TEMPORARY, '/temporary-guest/payment');

      expect(sectionTexts(root)).toEqual(['Estado de pago', 'Mis datos (pronto)']);
      expect(
        barNav(root).getByRole('link', { name: 'Estado de pago' }).getAttribute('aria-current'),
      ).toBe('page');
    });

    it('without sections (a guest of unknown type) there is no menu, only the name and «Salir»', async () => {
      const { root, ui } = await setup(NO_SECTIONS);

      expect(root.querySelector('nav')).toBeNull();
      expect(ui.queryByRole('button', { name: 'Menú' })).toBeNull();
      expect(ui.queryByRole('button', { name: /Tu cuenta/ })).toBeNull();
      expect(ui.getByText('Luz Mamani')).toBeTruthy();
      expect(ui.getByRole('button', { name: 'Salir' })).toBeTruthy();
    });

    // A0.7: a page that does not exist is shown in the shell to someone without a session too.
    it('without a session there is only the emblem and «Quipu»: no menu, no account, no «Salir»', async () => {
      TestBed.configureTestingModule({
        providers: [
          provideRouter(PATHS.map((path) => ({ path, component: PageStubComponent }))),
          provideHttpClient(),
          provideHttpClientTesting(),
        ],
      });
      const fixture = TestBed.createComponent(AppShellComponent);
      await fixture.whenStable();
      const root = fixture.nativeElement as HTMLElement;
      const ui = within(root);

      expect(element(root, 'header').textContent.trim()).toBe('Quipu');
      expect(element(root, 'header img.emblem').getAttribute('alt')).toBe('');
      expect(root.querySelector('nav')).toBeNull();
      expect(ui.queryAllByRole('button')).toHaveLength(0);
      expect(root.querySelectorAll('main')).toHaveLength(1);
    });

    it('has the band of 20 px under the bar, hidden from assistive technologies, and one main', async () => {
      const { root } = await setup(ADMIN);

      const band = root.querySelector('header + .quipu-band');
      expect(band?.getAttribute('aria-hidden')).toBe('true');
      expect(root.querySelectorAll('main')).toHaveLength(1);
    });
  });

  describe('account menu', () => {
    it('opens from the name: the administrator sees «Cambiar contraseña», the link «Administradores» and Salir, in that order', async () => {
      const { fixture, root } = await setup(ADMIN);
      const ui = within(root);

      const button = ui.getByRole('button', { name: 'Tu cuenta: Rosa Quispe' });
      expect(button.getAttribute('aria-expanded')).toBe('false');
      expect(root.querySelector('#account-menu')).toBeNull();
      await openAccount(fixture, 'Rosa Quispe');

      expect(button.getAttribute('aria-expanded')).toBe('true');
      expect(button.getAttribute('aria-controls')).toBe('account-menu');
      const menu = element(root, '#account-menu');
      expect(within(menu).getByText('Administración')).toBeTruthy();
      expect(
        [...menu.querySelectorAll('.account-items .item')].map((item) => [
          item.tagName,
          item.textContent.trim(),
        ]),
      ).toEqual([
        ['BUTTON', 'Cambiar contraseña'],
        ['A', 'Administradores'],
        ['BUTTON', 'Salir'],
      ]);
      expect(within(menu).getByRole('link', { name: 'Administradores' }).getAttribute('href')).toBe(
        '/admin/administrators',
      );
      expect(within(menu).queryByText(/Disponible pronto/)).toBeNull();
    });

    it('«Administradores» goes to A7, closes the menu and marks no section of the bar', async () => {
      const { fixture, root } = await setup(ADMIN);
      await openAccount(fixture, 'Rosa Quispe');

      fireEvent.click(
        within(element(root, '#account-menu')).getByRole('link', { name: 'Administradores' }),
      );
      await vi.waitFor(() => {
        expect(TestBed.inject(Router).url).toBe('/admin/administrators');
      });
      await fixture.whenStable();

      expect(root.querySelector('#account-menu')).toBeNull();
      expect(root.querySelector('header nav [aria-current="page"]')).toBeNull();
      expect(root.querySelector('header nav .is-current')).toBeNull();
    });

    it('a guest has no «Administradores» in its account menu', async () => {
      const { fixture, root } = await setup(CONTRACT);
      await openAccount(fixture, 'Ana Quispe');

      const menu = within(element(root, '#account-menu'));
      expect(menu.queryByText('Administradores')).toBeNull();
      expect(menu.queryByRole('link')).toBeNull();
    });

    it('«Cambiar contraseña» closes the menu and opens the dialog over the current page', async () => {
      const { fixture, root } = await setup(ADMIN, '/admin/payments');
      await openAccount(fixture, 'Rosa Quispe');

      fireEvent.click(
        within(element(root, '#account-menu')).getByRole('button', { name: 'Cambiar contraseña' }),
      );
      await fixture.whenStable();

      expect(root.querySelector('#account-menu')).toBeNull();
      expect(screen.getByRole('dialog', { name: 'Cambiar contraseña' })).toBeTruthy();
      expect(TestBed.inject(Router).url).toBe('/admin/payments');
    });

    it('a changed password closes the dialog and shows the toast «Contraseña cambiada.»', async () => {
      const { fixture, root } = await setup(CONTRACT);
      await openAccount(fixture, 'Ana Quispe');
      fireEvent.click(
        within(element(root, '#account-menu')).getByRole('button', { name: 'Cambiar contraseña' }),
      );
      await fixture.whenStable();
      expect(root.querySelector('output')?.textContent.trim()).toBe('');

      const dialog = within(screen.getByRole('dialog', { name: 'Cambiar contraseña' }));
      fireEvent.input(dialog.getByLabelText('Contraseña actual'), {
        target: { value: 'Actual12345' },
      });
      fireEvent.input(dialog.getByLabelText('Nueva contraseña'), {
        target: { value: 'Nueva12345' },
      });
      await fixture.whenStable();
      fireEvent.click(dialog.getByRole('button', { name: 'Cambiar contraseña' }));
      const req = await vi.waitFor(() => TestBed.inject(HttpTestingController).expectOne(isChange));
      req.flush(null, { status: 204, statusText: 'No Content' });

      await vi.waitFor(() => {
        expect(screen.queryByRole('dialog')).toBeNull();
      });
      await fixture.whenStable();
      expect(root.querySelector('output')?.textContent.trim()).toBe('Contraseña cambiada.');
      expect(root.querySelector('output .success svg')?.getAttribute('aria-hidden')).toBe('true');
    });

    it('a cancelled dialog shows no toast', async () => {
      const { fixture, root } = await setup(ADMIN);
      await openAccount(fixture, 'Rosa Quispe');
      fireEvent.click(
        within(element(root, '#account-menu')).getByRole('button', { name: 'Cambiar contraseña' }),
      );
      await fixture.whenStable();

      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
      await vi.waitFor(() => {
        expect(screen.queryByRole('dialog')).toBeNull();
      });
      await fixture.whenStable();

      expect(root.querySelector('output')?.textContent.trim()).toBe('');
    });

    it('a guest sees «Huésped» under the name', async () => {
      const { fixture, root } = await setup(CONTRACT);

      await openAccount(fixture, 'Ana Quispe');

      expect(within(element(root, '#account-menu')).getByText('Huésped')).toBeTruthy();
    });

    it('Escape closes it and gives the focus back to the name', async () => {
      const { fixture, root } = await setup(ADMIN);
      const button = await openAccount(fixture, 'Rosa Quispe');

      fireEvent.keyDown(document, { key: 'Escape' });
      await fixture.whenStable();

      expect(root.querySelector('#account-menu')).toBeNull();
      expect(button.getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(button);
    });

    it('a click outside closes it; a click inside does not', async () => {
      const { fixture, root } = await setup(ADMIN);
      await openAccount(fixture, 'Rosa Quispe');

      fireEvent.click(element(root, '#account-menu .who'));
      await fixture.whenStable();
      expect(root.querySelector('#account-menu')).toBeTruthy();

      fireEvent.click(element(root, 'main'));
      await fixture.whenStable();
      expect(root.querySelector('#account-menu')).toBeNull();
    });
  });

  describe('on a phone', () => {
    it('«Menú» (48 px) opens a panel with the sections and then the account', async () => {
      const { fixture, root, ui } = await setup(ADMIN, '/home');

      const menu = ui.getByRole('button', { name: 'Menú' });
      expect(menu.getAttribute('aria-expanded')).toBe('false');
      expect(root.querySelector('#menu-panel')).toBeNull();
      fireEvent.click(menu);
      await fixture.whenStable();

      expect(menu.getAttribute('aria-expanded')).toBe('true');
      expect(menu.getAttribute('aria-label')).toBe('Cerrar menú');
      expect(menu.getAttribute('aria-controls')).toBe('menu-panel');
      const panel = within(element(root, '#menu-panel'));
      expect(panel.getByRole('navigation', { name: 'Principal' })).toBeTruthy();
      expect(panel.getByRole('link', { name: 'Inicio' }).getAttribute('aria-current')).toBe('page');
      expect(panel.getByText('Rosa Quispe')).toBeTruthy();
      expect(panel.getByRole('button', { name: 'Salir' })).toBeTruthy();
    });

    it('«Cambiar contraseña» of the panel closes it and opens the dialog', async () => {
      const { fixture, root, ui } = await setup(TEMPORARY, '/temporary-guest/payment');
      fireEvent.click(ui.getByRole('button', { name: 'Menú' }));
      await fixture.whenStable();

      const panel = within(element(root, '#menu-panel'));
      expect(panel.queryByText('Administradores')).toBeNull();
      fireEvent.click(panel.getByRole('button', { name: 'Cambiar contraseña' }));
      await fixture.whenStable();

      expect(root.querySelector('#menu-panel')).toBeNull();
      expect(screen.getByRole('dialog', { name: 'Cambiar contraseña' })).toBeTruthy();
      expect(TestBed.inject(Router).url).toBe('/temporary-guest/payment');
    });

    it('Escape closes the panel and gives the focus back to «Menú»', async () => {
      const { fixture, root, ui } = await setup(TEMPORARY);
      const menu = ui.getByRole('button', { name: 'Menú' });
      fireEvent.click(menu);
      await fixture.whenStable();

      fireEvent.keyDown(document, { key: 'Escape' });
      await fixture.whenStable();

      expect(root.querySelector('#menu-panel')).toBeNull();
      expect(menu.getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(menu);
    });

    it('following a link of the panel closes it', async () => {
      const { fixture, root, ui } = await setup(CONTRACT);
      fireEvent.click(ui.getByRole('button', { name: 'Menú' }));
      await fixture.whenStable();

      const panel = within(element(root, '#menu-panel'));
      fireEvent.click(panel.getByRole('link', { name: 'Historial de pagos' }));
      await fixture.whenStable();

      expect(root.querySelector('#menu-panel')).toBeNull();
      await vi.waitFor(() => {
        expect(TestBed.inject(Router).url).toBe('/guest/payments');
      });
    });
  });

  describe('leaving', () => {
    it('tells the BFF to close the session, forgets it and goes to /login?signedOut=1', async () => {
      const { auth, fixture, root } = await setup(ADMIN);
      await openAccount(fixture, 'Rosa Quispe');

      fireEvent.click(within(root).getByRole('button', { name: 'Salir' }));
      TestBed.inject(HttpTestingController)
        .expectOne(isLogout)
        .flush(null, { status: 204, statusText: 'No Content' });
      await fixture.whenStable();

      expect(auth.session()).toBeNull();
      await vi.waitFor(() => {
        expect(TestBed.inject(Router).url).toBe('/login?signedOut=1');
      });
    });

    it('asks the BFF to close the session once, however many times «Salir» is clicked', async () => {
      const { ui } = await setup(NO_SECTIONS);

      const leave = ui.getByRole('button', { name: 'Salir' });
      fireEvent.click(leave);
      fireEvent.click(leave);

      const requests = TestBed.inject(HttpTestingController).match(isLogout);
      expect(requests).toHaveLength(1);
      for (const request of requests) {
        request.flush(null, { status: 204, statusText: 'No Content' });
      }
    });

    it('leaves to /login?signedOut=1 even when the BFF cannot be reached', async () => {
      const { auth, ui, fixture } = await setup(NO_SECTIONS);

      fireEvent.click(ui.getByRole('button', { name: 'Salir' }));
      TestBed.inject(HttpTestingController).expectOne(isLogout).error(new ProgressEvent('error'));
      await fixture.whenStable();

      expect(auth.session()).toBeNull();
      await vi.waitFor(() => {
        expect(TestBed.inject(Router).url).toBe('/login?signedOut=1');
      });
    });
  });
});

describe('app-nav', () => {
  it('has no sections without a session', () => {
    expect(sectionsFor(null)).toEqual([]);
  });

  it('a section without a screen is never current', () => {
    expect(isCurrent({ label: 'Ambientes', link: null }, '/admin/environments')).toBe(false);
  });

  it('a section is current on its own path and below it, not on a path that only starts alike', () => {
    const pagos = { label: 'Pagos', link: '/admin/payments' };

    expect(isCurrent(pagos, '/admin/payments')).toBe(true);
    expect(isCurrent(pagos, '/admin/payments/42')).toBe(true);
    expect(isCurrent(pagos, '/admin/payments?status=OVERDUE')).toBe(true);
    expect(isCurrent(pagos, '/admin/paymentsx')).toBe(false);
  });

  it('the account menu has the action «Cambiar contraseña» for every role and «Administradores» only for the administrator', () => {
    const changePassword = { kind: 'changePassword', label: 'Cambiar contraseña' };
    expect(accountEntriesFor(null)).toEqual([changePassword]);
    expect(accountEntriesFor({ role: 'ADMIN', name: 'a', mustChangePassword: false })).toEqual([
      changePassword,
      { kind: 'link', label: 'Administradores', link: '/admin/administrators' },
    ]);
    expect(
      accountEntriesFor({
        role: 'GUEST',
        name: 'b',
        mustChangePassword: false,
        guestType: 'CONTRACT',
      }),
    ).toEqual([changePassword]);
    expect(
      accountEntriesFor({
        role: 'GUEST',
        name: 'c',
        mustChangePassword: false,
        guestType: 'TEMPORARY',
      }),
    ).toEqual([changePassword]);
  });

  it('no section of the administrator is current in A7', () => {
    const admin = { role: 'ADMIN', name: 'a', mustChangePassword: false } as const;
    expect(sectionsFor(admin).filter((entry) => isCurrent(entry, '/admin/administrators'))).toEqual(
      [],
    );
  });
});
