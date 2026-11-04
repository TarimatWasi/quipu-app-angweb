import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogClose } from '@angular/material/dialog';
import { screen, within } from '@testing-library/angular';
import { DialogFrameComponent } from './dialog-frame.component';

@Component({
  selector: 'app-sample-dialog',
  imports: [DialogFrameComponent, MatDialogClose],
  template: `
    <app-dialog-frame heading="¿Rechazar el pago?">
      <p>El huésped verá el motivo.</p>
      <ng-container dialogActions>
        <button class="quipu-button quipu-button--tertiary" type="button" mat-dialog-close>
          Cancelar
        </button>
        <button class="quipu-button quipu-button--primary" type="button" [mat-dialog-close]="true">
          Rechazar pago
        </button>
      </ng-container>
    </app-dialog-frame>
  `,
})
class SampleDialogComponent {}

@Component({ selector: 'app-opener', template: '' })
class OpenerComponent {
  readonly dialog = inject(MatDialog);
}

describe('DialogFrameComponent (P-16)', () => {
  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
  });

  it('labels the dialog with its title and puts the actions in its action row', async () => {
    const fixture = TestBed.createComponent(OpenerComponent);
    fixture.componentInstance.dialog.open(SampleDialogComponent);
    await fixture.whenStable();

    const dialog = screen.getByRole('dialog', { name: '¿Rechazar el pago?' });
    expect(within(dialog).getByRole('heading', { level: 2 }).classList).toContain(
      'mat-mdc-dialog-title',
    );
    expect(within(dialog).getByText('El huésped verá el motivo.')).toBeTruthy();
    const actions = dialog.querySelector('mat-dialog-actions');
    expect(actions?.classList).toContain('mat-mdc-dialog-actions-align-end');
    expect(
      within(actions as HTMLElement)
        .getAllByRole('button')
        .map((b) => b.textContent.trim()),
    ).toEqual(['Cancelar', 'Rechazar pago']);
  });

  it('closes with the value of the chosen action', async () => {
    const fixture = TestBed.createComponent(OpenerComponent);
    const ref = fixture.componentInstance.dialog.open<SampleDialogComponent, unknown, boolean>(
      SampleDialogComponent,
    );
    await fixture.whenStable();
    const closed = vi.fn<(result: boolean | undefined) => void>();
    ref.afterClosed().subscribe(closed);

    screen.getByRole('button', { name: 'Rechazar pago' }).click();

    await vi.waitFor(() => {
      expect(closed).toHaveBeenCalledWith(true);
    });
  });
});
