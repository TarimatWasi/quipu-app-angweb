import { MockControlsComponent } from './mock-controls.component';
import { MockRequestControls } from './mock-request-controls';
import { DOCUMENT } from '@angular/common';
import { Component, computed, inject, InjectionToken, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { DEMO_CLAVE, DEMO_USERS, isDemoUserKey } from './data/demo-users';
import { MockBff } from './mock-bff';
import { isMockScenario, MOCK_SCENARIOS } from './mock-scenarios';

/** Reloads the page, so every screen asks the simulated BFF again. */
export const MOCK_RELOAD = new InjectionToken<() => void>('MOCK_RELOAD', {
  providedIn: 'root',
  factory: () => {
    const location = inject(DOCUMENT).location;
    return () => {
      location.reload();
    };
  },
});

/**
 * The floating panel of the `mock` profile: the demo role and the scenario of the simulated BFF.
 * A role changes without reloading the page (the session lives in memory, so it works even when
 * the browser blocks the storage); a scenario reloads it when the choice could be kept.
 */
@Component({
  selector: 'app-mock-panel',
  imports: [MockControlsComponent],
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
          <app-mock-controls
            [active]="current() === 'normal'"
            (scenarioReset)="syncScenario()"
            (reloadRequested)="reloadPage()"
          />
        </form>
      }
    </div>
  `,
  styles: `
    .panel {
      position: fixed;
      inset: auto auto 1rem 1rem;
      z-index: 2000;
      width: min(24rem, calc(100vw - 2rem));
      max-height: calc(100dvh - 2rem);
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
      max-height: calc(100dvh - 6rem);
      overflow-y: auto;
      overscroll-behavior: contain;
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
  private readonly controls = inject(MockRequestControls);
  private readonly bff = inject(MockBff);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly reload = inject(MOCK_RELOAD);

  protected readonly users = Object.values(DEMO_USERS);
  protected readonly scenarios = Object.entries(MOCK_SCENARIOS).map(([key, label]) => ({
    key,
    label,
  }));
  protected readonly clave = DEMO_CLAVE;
  protected readonly open = signal(false);
  /** The role of the session in force, also when it was opened or closed from the app's screens. */
  protected readonly role = computed(() => this.bff.sessionUser()?.key ?? '');
  protected readonly current = signal(this.bff.scenario());
  protected readonly scenarioLabel = computed(() => MOCK_SCENARIOS[this.current()]);

  protected reloadPage(): void {
    this.reload();
  }

  protected syncScenario(): void {
    this.current.set(this.bff.scenario());
  }

  protected toggle(): void {
    this.open.update((open) => !open);
  }

  protected chooseRole(event: Event): void {
    void this.switchRole((event.target as HTMLSelectElement).value);
  }

  /**
   * Opens the session of the demo account (or closes it) and goes to its first page with the
   * router: the app learns the new session from /me, as after a reload, but nothing is reloaded.
   */
  async switchRole(key: string): Promise<void> {
    this.controls.cancelAll();
    if (isDemoUserKey(key)) {
      this.bff.signIn(DEMO_USERS[key]);
      await firstValueFrom(this.auth.restore());
      await this.router.navigateByUrl('/home');
    } else {
      this.bff.signOut();
      this.auth.clear();
      await this.router.navigateByUrl('/login');
    }
  }

  /**
   * Starts the data of the scenario again and reloads the page so every screen asks anew. When the
   * browser cannot keep the choice, a reload would lose it: the app goes home instead.
   */
  protected chooseScenario(event: Event): void {
    const scenario = (event.target as HTMLSelectElement).value;
    if (!isMockScenario(scenario)) {
      return;
    }
    this.controls.reset();
    this.current.set(scenario);
    if (this.bff.setScenario(scenario)) {
      this.reload();
    } else {
      void this.router.navigateByUrl('/home');
    }
  }
}
