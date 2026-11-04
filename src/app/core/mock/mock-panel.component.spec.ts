import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import { firstValueFrom } from 'rxjs';
import { DEMO_USERS } from './data/demo-users';
import { MOCK_BUNDLE_MARKER, MOCK_HEADER, MOCK_LATENCY, MockBff } from './mock-bff';
import { resetMockSettings } from './mock-bff.testing';
import { MOCK_NAVIGATION, MockPanelComponent } from './mock-panel.component';
import { mountMockPanel, withMockBff } from './mock-providers';
import { readMockSetting } from './mock-storage';

function navigation() {
  return { assign: vi.fn<(url: string) => void>(), reload: vi.fn<() => void>() };
}

async function renderPanel() {
  const nav = navigation();
  await render(MockPanelComponent, { providers: [{ provide: MOCK_NAVIGATION, useValue: nav }] });
  screen.getByRole('button', { name: 'Simulación: Normal' }).click();
  await TestBed.inject(ApplicationRef).whenStable();
  return nav;
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

  it('opens the session of the chosen role and goes home; «Sin sesión» closes it', async () => {
    const nav = await renderPanel();
    choose('Rol', 'temporary-guest');
    expect(TestBed.inject(MockBff).user()?.key).toBe('temporary-guest');
    expect(nav.assign).toHaveBeenCalledWith('/home');
    choose('Rol', '');
    expect(TestBed.inject(MockBff).user()).toBeNull();
    expect(nav.assign).toHaveBeenLastCalledWith('/login');
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

  it('keeps the chosen scenario and reloads the page', async () => {
    const nav = await renderPanel();
    choose('Escenario', 'load-error');
    expect(readMockSetting('quipu-mock:scenario')).toBe('load-error');
    expect(TestBed.inject(MockBff).scenario()).toBe('load-error');
    expect(nav.reload).toHaveBeenCalledTimes(1);
    choose('Escenario', 'no-existe');
    expect(nav.reload).toHaveBeenCalledTimes(1);
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
    expect(config.providers).toHaveLength(3);
    TestBed.configureTestingModule({ providers: config.providers });
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
