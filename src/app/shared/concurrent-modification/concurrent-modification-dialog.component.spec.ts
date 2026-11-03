import { InteractivityChecker } from '@angular/cdk/a11y';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { fireEvent, screen, within } from '@testing-library/dom';
import { firstValueFrom } from 'rxjs';
import {
  CONCURRENT_MODIFICATION_TEXT,
  type ConcurrentModificationDialogData,
  openConcurrentModificationDialog,
} from './concurrent-modification-dialog.component';

const BODY = 'El registro cambió mientras lo editabas; vuelve a cargarlo e inténtalo de nuevo';

async function open(data?: ConcurrentModificationDialogData) {
  TestBed.configureTestingModule({
    providers: [{ provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } }],
  });
  const dialog = TestBed.inject(MatDialog);
  const ref = openConcurrentModificationDialog(dialog, data);
  const result = firstValueFrom(ref.afterClosed());
  await TestBed.inject(ApplicationRef).whenStable();
  const element = await screen.findByRole('alertdialog');
  return { ref, result, element, ui: within(element) };
}

const isGone = () =>
  vi.waitFor(() => {
    expect(document.body.querySelector('[role="alertdialog"]')).toBeNull();
  });

describe('ConcurrentModificationDialogComponent (BE-SPR-DAT-13)', () => {
  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
  });

  it('shows the fixed sentence, word for word', async () => {
    const { ui } = await open();

    expect(CONCURRENT_MODIFICATION_TEXT).toBe(BODY);
    expect(ui.getByText(BODY).textContent.trim()).toBe(BODY);
  });

  it('is named by the default title when no title is given', async () => {
    const { element } = await open();

    expect(element.getAttribute('aria-modal')).toBe('true');
    expect(screen.getByRole('alertdialog', { name: 'El registro cambió' })).toBe(element);
  });

  it('is named by the title the screen gives', async () => {
    const { element, ui } = await open({ title: 'El ambiente cambió' });

    expect(screen.getByRole('alertdialog', { name: 'El ambiente cambió' })).toBe(element);
    expect(ui.queryByText('El registro cambió')).toBeNull();
  });

  it('is described by the fixed sentence', async () => {
    const { element } = await open();

    const describedBy = element.getAttribute('aria-describedby') ?? '';
    expect(describedBy).not.toBe('');
    expect(document.getElementById(describedBy)?.textContent.trim()).toBe(BODY);
  });

  it('shows the title and the secondary label as text, never as markup', async () => {
    const { ui, element } = await open({
      title: '<b>El ambiente</b> cambió',
      backLabel: '<i>Volver</i>',
    });

    expect(ui.getByRole('heading', { name: '<b>El ambiente</b> cambió' })).toBeTruthy();
    expect(ui.getByRole('button', { name: '<i>Volver</i>' })).toBeTruthy();
    expect(element.querySelector('b, i')).toBeNull();
  });

  it('offers only "Volver a cargar" when there is no secondary action', async () => {
    const { ui } = await open();

    const buttons = ui.getAllByRole('button');
    expect(buttons.map((button) => button.textContent.trim())).toEqual(['Volver a cargar']);
  });

  it('puts the focus on "Volver a cargar", not on the secondary action', async () => {
    // jsdom has no layout, so every element would look hidden to the focus trap; this checker
    // treats them as visible so the real initial-focus rule (cdkFocusInitial) is what decides.
    const checker = {
      isDisabled: () => false,
      isVisible: () => true,
      isTabbable: () => true,
      isFocusable: () => true,
    };
    TestBed.overrideProvider(InteractivityChecker, { useValue: checker });
    const { ui } = await open({ backLabel: 'Volver a Ambientes' });

    await vi.waitFor(() => {
      expect(document.activeElement).toBe(ui.getByRole('button', { name: 'Volver a cargar' }));
    });
  });

  it('shows the secondary action with the label the screen gives', async () => {
    const { ui } = await open({ backLabel: 'Volver a Ambientes' });

    const buttons = ui.getAllByRole('button');
    expect(buttons.map((button) => button.textContent.trim())).toEqual([
      'Volver a cargar',
      'Volver a Ambientes',
    ]);
  });

  it('hides the secondary action when its label is blank', async () => {
    const { ui } = await open({ backLabel: '   ' });

    expect(ui.getAllByRole('button')).toHaveLength(1);
  });

  it('answers "reload" when the person presses "Volver a cargar"', async () => {
    const { ui, result } = await open({ backLabel: 'Volver a Ambientes' });

    fireEvent.click(ui.getByRole('button', { name: 'Volver a cargar' }));

    await expect(result).resolves.toBe('reload');
    await isGone();
  });

  it('answers "back" when the person takes the secondary action', async () => {
    const { ui, result } = await open({ backLabel: 'Volver a Ambientes' });

    fireEvent.click(ui.getByRole('button', { name: 'Volver a Ambientes' }));

    await expect(result).resolves.toBe('back');
    await isGone();
  });

  it('answers undefined, which never means reload, when closed with Escape', async () => {
    const { element, result } = await open({ backLabel: 'Volver a Ambientes' });

    fireEvent.keyDown(element, { key: 'Escape', code: 'Escape', keyCode: 27 });

    await expect(result).resolves.toBeUndefined();
    await isGone();
  });

  it('shows no English text', async () => {
    const { element } = await open({ backLabel: 'Volver a Ambientes' });

    expect(element.textContent).not.toMatch(/\b(reload|back|close|cancel|ok)\b/i);
  });
});
