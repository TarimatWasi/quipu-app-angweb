import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { fireEvent, within } from '@testing-library/dom';
import { FileFieldComponent } from './file-field.component';

@Component({
  imports: [FileFieldComponent],
  template: `
    <app-file-field
      fieldId="proof-file"
      [fileName]="name()"
      [error]="error()"
      [camera]="camera()"
      [removable]="removable()"
      (chosen)="chosen.set($event)"
    />
  `,
})
class HostComponent {
  readonly name = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly camera = signal(true);
  readonly removable = signal(false);
  readonly chosen = signal<File | null | undefined>(undefined);
}

async function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  return {
    fixture,
    host: fixture.componentInstance,
    ui: within(fixture.nativeElement as HTMLElement),
  };
}

describe('FileFieldComponent (P-12)', () => {
  it('offers «Elegir archivo» and reports the file chosen, then clears the input', async () => {
    const { ui, host } = await setup();
    const input = ui.getByLabelText<HTMLInputElement>('Archivo del voucher');
    expect(input.getAttribute('accept')).toContain('application/pdf');
    expect(input.getAttribute('aria-describedby')).toBe('proof-file-help');
    expect(ui.getByText('Elegir archivo')).toBeTruthy();

    const file = new File(['x'], 'yape.jpg', { type: 'image/jpeg' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    fireEvent.change(input);
    await vi.waitFor(() => {
      expect(host.chosen()).toBe(file);
    });
  });

  it('shows the file kept with «Cambiar», and the error tied to the input', async () => {
    const { ui, host, fixture } = await setup();
    host.name.set('yape.jpg');
    host.error.set('Archivo inválido');
    await fixture.whenStable();

    expect(ui.getByText('yape.jpg')).toBeTruthy();
    expect(ui.getByText('Cambiar')).toBeTruthy();
    const input = ui.getByLabelText('Archivo del voucher');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('proof-file-error');
    expect(ui.getByText('Archivo inválido').id).toBe('proof-file-error');
  });

  it('offers «Tomar foto» with the camera of the device, which reports the photo like a file', async () => {
    const { ui, host } = await setup();

    expect(ui.getByText('Tomar foto')).toBeTruthy();
    const camera = ui.getByLabelText<HTMLInputElement>('Archivo del voucher con la cámara');
    expect(camera.getAttribute('capture')).toBe('environment');
    expect(camera.getAttribute('accept')).toBe('image/*');
    const photo = new File(['x'], 'foto.jpg', { type: 'image/jpeg' });
    Object.defineProperty(camera, 'files', { value: [photo], configurable: true });
    fireEvent.change(camera);

    await vi.waitFor(() => {
      expect(host.chosen()).toBe(photo);
    });
  });

  it('leaves out the camera when the screen does not want it', async () => {
    const { ui, host, fixture } = await setup();
    host.camera.set(false);
    await fixture.whenStable();

    expect(ui.queryByText('Tomar foto')).toBeNull();
    expect(ui.queryByLabelText('Archivo del voucher con la cámara')).toBeNull();
  });

  it('offers «Quitar» only when the screen allows it, and reports no file', async () => {
    const { ui, host, fixture } = await setup();
    host.name.set('yape.jpg');
    await fixture.whenStable();
    expect(ui.queryByText('Quitar')).toBeNull();

    host.removable.set(true);
    await fixture.whenStable();
    ui.getByText('Quitar').closest('button')?.click();

    expect(host.chosen()).toBeNull();
  });

  it('says the voucher prompt by width and camera when the screen names none (D-92)', async () => {
    const { ui, host, fixture } = await setup();
    expect(ui.getByText('Arrastra aquí la foto o el PDF del voucher').className).toBe('only-wide');
    expect(ui.getByText('Toma una foto del voucher o elige el archivo').className).toBe(
      'only-narrow',
    );

    host.camera.set(false);
    await fixture.whenStable();
    expect(ui.getByText('Elige la foto o el PDF del voucher').className).toBe('only-narrow');
  });

  it('reports a file dropped on the zone, and ignores a drop that carries none', async () => {
    const { ui, host, fixture } = await setup();
    const zone = ui.getByText('Elegir archivo').closest<HTMLElement>('.drop');
    if (zone === null) throw new Error('The zone is missing');

    fireEvent.dragOver(zone);
    await fixture.whenStable();
    expect(zone.classList).toContain('over');

    fireEvent.drop(zone, { dataTransfer: { files: [] } });
    await fixture.whenStable();
    expect(zone.classList).not.toContain('over');
    expect(host.chosen()).toBeUndefined();

    const file = new File(['x'], 'yape.pdf', { type: 'application/pdf' });
    fireEvent.drop(zone, { dataTransfer: { files: [file] } });
    await vi.waitFor(() => {
      expect(host.chosen()).toBe(file);
    });
  });
});
