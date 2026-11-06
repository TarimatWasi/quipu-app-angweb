import { Component, inject, input, output, signal } from '@angular/core';
import { MockBff } from './mock-bff';
import {
  FailureKind,
  MOCK_TARGETS,
  MockRequestControls,
  RequestMode,
} from './mock-request-controls';
import { isPresentationPreset, PRESENTATION_PRESETS } from './data/presentation-presets';

@Component({
  selector: 'app-mock-controls',
  templateUrl: './mock-controls.component.html',
  styleUrl: './mock-controls.component.scss',
})
export class MockControlsComponent {
  protected readonly controls = inject(MockRequestControls);
  private readonly bff = inject(MockBff);
  readonly active = input(false);
  readonly reloadRequested = output();
  readonly scenarioReset = output();
  protected readonly targets = MOCK_TARGETS;
  protected readonly kind = signal<FailureKind>('server');
  protected readonly notice = signal('');
  protected readonly preset = signal(this.bff.presentationPreset());
  protected readonly presets = Object.entries(PRESENTATION_PRESETS).map(([key, label]) => ({
    key,
    label,
  }));
  protected readonly modes: readonly { key: RequestMode; label: string }[] = [
    { key: 'normal', label: 'Normal' },
    { key: 'hold', label: 'Retener hasta liberar' },
    { key: 'slow', label: 'Demorar 9 segundos' },
    { key: 'fail-next', label: 'Fallar la siguiente' },
  ];

  protected configure(index: number, event: Event): void {
    const target = this.targets[index];
    const mode = (event.target as HTMLSelectElement).value;
    if (target && this.modes.some((entry) => entry.key === mode)) {
      this.controls.configure(target.key, mode as RequestMode, this.kind());
    }
  }

  protected chooseFailure(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (['server', 'conflict', 'validation', 'storage'].includes(value))
      this.kind.set(value as FailureKind);
  }

  protected choosePreset(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (isPresentationPreset(value)) this.preset.set(value);
  }

  protected applyData(reset = false): void {
    this.controls.reset();
    this.preset.set(reset ? 'standard' : this.preset());
    const dataSaved = this.bff.setPresentation(this.preset());
    const scenarioSaved = this.bff.setScenario('normal');
    this.scenarioReset.emit();
    if (dataSaved && scenarioSaved) this.reloadRequested.emit();
    else
      this.notice.set(
        'Datos reiniciados en memoria. El almacenamiento está bloqueado: sal de la pantalla y vuelve a entrar.',
      );
  }

  protected reloadView(): void {
    if (this.controls.storageAvailable()) this.reloadRequested.emit();
    else
      this.notice.set(
        'El almacenamiento está bloqueado: conserva la pestaña, sal de la pantalla y vuelve a entrar.',
      );
  }
}
