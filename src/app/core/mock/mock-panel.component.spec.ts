import { CHANGES_ENABLED } from '@core/changes/change-stream.service';
import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { DEMO_USERS } from './data/demo-users';
import { MOCK_BUNDLE_MARKER, MOCK_HEADER, MOCK_LATENCY, MockBff } from './mock-bff';
import { mockBffInterceptor } from './mock-bff.interceptor';
import { resetMockSettings } from './mock-bff.testing';
import { MOCK_RELOAD, MockPanelComponent } from './mock-panel.component';
import { mountMockPanel, withMockBff } from './mock-providers';
import { readMockSetting } from './mock-storage';

@Component({ selector: 'app-blank', template: '' })
class BlankComponent {}

/** The panel with the router, the session of the app and the simulated BFF without delay. */
async function renderPanel() {
  const reload = vi.fn<() => void>();
  await render(MockPanelComponent, {
    providers: [
      provideRouter([
        { path: 'home', component: BlankComponent },
        { path: 'login', component: BlankComponent },
      ]),
      provideHttpClient(withInterceptors([mockBffInterceptor])),
      { provide: MOCK_LATENCY, useValue: { normalMs: 0, slowMs: 0 } },
      { provide: MOCK_RELOAD, useValue: reload },
    ],
  });
  screen.getByRole('button', { name: 'Simulación: Normal' }).click();
  await TestBed.inject(ApplicationRef).whenStable();
  return reload;
}

/** Makes the browser storage refuse every write and forget every read. */
function blockStorage(): void {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('QuotaExceededError');
  });
  vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
}

function choose(label: string, value: string): void {
  const select = screen.getByLabelText<HTMLSelectElement>(label);
  select.value = value;
  select.dispatchEvent(new Event('change'));
}

describe('MockPanelComponent', () => {
  beforeEach(() => {
    resetMockSettings();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetMockSettings();
  });

  it('opens a labelled group with the role and the scenario', async () => {
    await renderPanel();
    expect(
      screen.getByRole('button', { name: 'Simulación: Normal' }).getAttribute('aria-expanded'),
    ).toBe('true');
    expect(screen.getByRole('group', { name: 'Backend simulado (perfil mock)' })).toBeTruthy();
    const roles = screen.getByLabelText<HTMLSelectElement>('Rol');
    expect([...roles.options].map((option) => option.text.trim())).toEqual([
      'Sin sesión',
      'Administración',
      'Huésped con contrato',
      'Huésped temporal',
      'Huésped con clave temporal',
      'Huésped en su registro',
    ]);
    const scenarios = screen.getByLabelText<HTMLSelectElement>('Escenario');
    expect([...scenarios.options].map((option) => option.text.trim())).toEqual([
      'Normal',
      'Vacío',
      'Error de carga',
      'Servidor lento',
      'Conflicto 409',
    ]);
  });

  it('opens the session of the chosen role and goes home without reloading', async () => {
    const reload = await renderPanel();
    const router = TestBed.inject(Router);
    const auth = TestBed.inject(AuthService);
    choose('Rol', 'temporary-guest');
    await vi.waitFor(() => {
      expect(router.url).toBe('/home');
    });
    expect(TestBed.inject(MockBff).user()?.key).toBe('temporary-guest');
    expect(auth.session()).toEqual(
      expect.objectContaining({ role: 'GUEST', guestType: 'TEMPORARY' }),
    );
    choose('Rol', '');
    await vi.waitFor(() => {
      expect(router.url).toBe('/login');
    });
    expect(TestBed.inject(MockBff).user()).toBeNull();
    expect(auth.session()).toBeNull();
    expect(reload).not.toHaveBeenCalled();
  });

  it('keeps the chosen role when the browser blocks the storage', async () => {
    const reload = await renderPanel();
    blockStorage();
    choose('Rol', 'admin');
    await vi.waitFor(() => {
      expect(TestBed.inject(Router).url).toBe('/home');
    });
    expect(TestBed.inject(AuthService).session()).toEqual(
      expect.objectContaining({ role: 'ADMIN' }),
    );
    expect(reload).not.toHaveBeenCalled();
  });

  it('follows the session opened or closed from the app, not only from the panel', async () => {
    await renderPanel();
    const roles = screen.getByLabelText<HTMLSelectElement>('Rol');
    expect(roles.value).toBe('');
    const bff = TestBed.inject(MockBff);
    bff.signIn(DEMO_USERS.admin);
    await TestBed.inject(ApplicationRef).whenStable();
    expect(roles.value).toBe('admin');
    bff.signOut();
    await TestBed.inject(ApplicationRef).whenStable();
    expect(roles.value).toBe('');
  });

  it('expires the access or the whole session of the role in force (TAR-364)', async () => {
    await renderPanel();
    const access = screen.getByRole<HTMLButtonElement>('button', { name: 'Vencer el acceso' });
    const session = screen.getByRole<HTMLButtonElement>('button', { name: 'Vencer la sesión' });
    expect([access.disabled, session.disabled]).toEqual([true, true]);
    expect(screen.getByText('Sin sesión.')).toBeTruthy();
    const bff = TestBed.inject(MockBff);
    bff.signIn(DEMO_USERS.admin);
    await TestBed.inject(ApplicationRef).whenStable();
    expect(screen.getByText('La sesión está vigente.')).toBeTruthy();

    access.click();
    await TestBed.inject(ApplicationRef).whenStable();
    expect(bff.sessionState()).toBe('access-expired');
    expect(
      screen.getByText(
        'El acceso venció: la próxima llamada recibe un 401 y la app lo renueva sola.',
      ),
    ).toBeTruthy();

    session.click();
    await TestBed.inject(ApplicationRef).whenStable();
    expect(bff.sessionState()).toBe('expired');
    expect(
      screen.getByText('La sesión venció: la próxima llamada lleva al inicio de sesión.'),
    ).toBeTruthy();
  });

  it('keeps the chosen scenario and reloads the page', async () => {
    const reload = await renderPanel();
    choose('Escenario', 'load-error');
    expect(readMockSetting('quipu-mock:scenario')).toBe('load-error');
    expect(TestBed.inject(MockBff).scenario()).toBe('load-error');
    expect(reload).toHaveBeenCalledTimes(1);
    choose('Escenario', 'no-existe');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does not reload when the scenario cannot be kept: a reload would lose it', async () => {
    const reload = await renderPanel();
    blockStorage();
    choose('Escenario', 'empty');
    await vi.waitFor(() => {
      expect(TestBed.inject(Router).url).toBe('/home');
    });
    expect(TestBed.inject(MockBff).scenario()).toBe('empty');
    expect(reload).not.toHaveBeenCalled();
  });
});

describe('withMockBff', () => {
  afterEach(() => {
    resetMockSettings();
    document.querySelectorAll('app-mock-panel').forEach((element) => {
      element.remove();
    });
  });

  it('keeps the providers of the app and adds the simulated BFF after them', async () => {
    const config = withMockBff({
      providers: [{ provide: MOCK_LATENCY, useValue: { normalMs: 0, slowMs: 0 } }],
    });
    TestBed.configureTestingModule({ providers: config.providers });
    expect(TestBed.inject(CHANGES_ENABLED)).toBe(false);
    const error: unknown = await firstValueFrom(
      TestBed.inject(HttpClient).get('/bff/auth/me'),
    ).catch((failure: unknown) => failure);
    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect((error as HttpErrorResponse).status).toBe(401);
    expect((error as HttpErrorResponse).headers.get(MOCK_HEADER)).toBe(MOCK_BUNDLE_MARKER);
    expect(document.querySelectorAll('app-mock-panel')).toHaveLength(1);
  });

  it('mounts the panel once on the page', () => {
    TestBed.runInInjectionContext(mountMockPanel);
    expect(document.querySelectorAll('app-mock-panel')).toHaveLength(1);
  });
});
