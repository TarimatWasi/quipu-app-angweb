import { DOCUMENT } from '@angular/common';
import { Component, computed, inject, InjectionToken, signal } from '@angular/core';
import { DEMO_CLAVE, DEMO_USERS, isDemoUserKey } from './data/demo-users';
import { MockBff } from './mock-bff';
import { isMockScenario, MOCK_SCENARIOS } from './mock-scenarios';

/** How the panel leaves the page: a full load, so the app asks the BFF again from scratch. */
export interface MockNavigation {
  assign(url: string): void;
  reload(): void;
}

export const MOCK_NAVIGATION = new InjectionToken<MockNavigation>('MOCK_NAVIGATION', {
  providedIn: 'root',
  factory: () => inject(DOCUMENT).location,
});

/**
 * The floating panel of the `mock` profile: the demo role and the scenario of the simulated BFF.
 * Each change reloads the page, so every screen asks again with the new role or scenario.
 */
@Component({
  selector: 'app-mock-panel',
  template: `
    <div class="panel">
      <button
        type="button"
        class="toggle"
        aria-controls="quipu-mock-panel"
        [attr.aria-expanded]="open()"
        (click)="toggle()"
      >
        Simulación: {{ scenarioLabel() }}
      </button>
      @if (open()) {
        <form id="quipu-mock-panel" class="body" (submit)="$event.preventDefault()">
          <fieldset>
            <legend>Backend simulado (perfil mock)</legend>
            <label for="quipu-mock-role">Rol</label>
            <select id="quipu-mock-role" (change)="chooseRole($event)">
              <option value="" [selected]="role() === ''">Sin sesión</option>
              @for (user of users; track user.key) {
                <option [value]="user.key" [selected]="role() === user.key">
                  {{ user.label }}
                </option>
              }
            </select>
            <label for="quipu-mock-scenario">Escenario</label>
            <select id="quipu-mock-scenario" (change)="chooseScenario($event)">
              @for (scenario of scenarios; track scenario.key) {
                <option [value]="scenario.key" [selected]="current() === scenario.key">
                  {{ scenario.label }}
                </option>
              }
            </select>
            <p class="hint">Clave de las cuentas demo: {{ clave }}</p>
          </fieldset>
        </form>
      }
    </div>
  `,
  styles: `
    .panel {
      position: fixed;
      inset: auto auto 1rem 1rem;
      z-index: 1000;
      max-width: 18rem;
      font:
        0.875rem/1.4 system-ui,
        sans-serif;
    }
    .toggle {
      padding: 0.5rem 0.75rem;
      border: 1px solid #5b3a00;
      border-radius: 1rem;
      background: #ffe8b3;
      color: #3d2700;
      cursor: pointer;
    }
    .body {
      margin-top: 0.5rem;
      padding: 0.75rem;
      border: 1px solid #5b3a00;
      border-radius: 0.5rem;
      background: #fffaf0;
      color: #1f1400;
    }
    fieldset {
      display: grid;
      gap: 0.25rem;
      margin: 0;
      padding: 0;
      border: 0;
    }
    legend {
      font-weight: 600;
      margin-bottom: 0.25rem;
    }
    .hint {
      margin: 0.5rem 0 0;
    }
  `,
})
export class MockPanelComponent {
  private readonly bff = inject(MockBff);
  private readonly location = inject(MOCK_NAVIGATION);

  protected readonly users = Object.values(DEMO_USERS);
  protected readonly scenarios = Object.entries(MOCK_SCENARIOS).map(([key, label]) => ({
    key,
    label,
  }));
  protected readonly clave = DEMO_CLAVE;
  protected readonly open = signal(false);
  protected readonly role = signal(this.bff.user()?.key ?? '');
  protected readonly current = signal(this.bff.scenario());
  protected readonly scenarioLabel = computed(() => MOCK_SCENARIOS[this.current()]);

  protected toggle(): void {
    this.open.update((open) => !open);
  }

  /** Opens the session of the demo account (or closes it) and goes to its first page. */
  protected chooseRole(event: Event): void {
    const key = (event.target as HTMLSelectElement).value;
    if (isDemoUserKey(key)) {
      this.bff.signIn(DEMO_USERS[key]);
      this.location.assign('/home');
    } else {
      this.bff.signOut();
      this.location.assign('/login');
    }
  }

  protected chooseScenario(event: Event): void {
    const scenario = (event.target as HTMLSelectElement).value;
    if (isMockScenario(scenario)) {
      this.bff.setScenario(scenario);
      this.location.reload();
    }
  }
}
