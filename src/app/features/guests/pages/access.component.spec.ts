import { Clipboard } from '@angular/cdk/clipboard';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { fireEvent, within } from '@testing-library/dom';
import { AccessHandoffService } from '../data/access-handoff.service';
import type { AccessHandoff } from '../data/access-handoff.service';
import { AccessComponent } from './access.component';

const squash = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim();
const MINUTE = 60_000;

function handoff(overrides: Partial<AccessHandoff> = {}, minutesLeft = 30): AccessHandoff {
  return {
    guestId: 'g1',
    documentType: 'DNI',
    documentNumber: '70412233',
    type: 'CONTRACT',
    phone: null,
    contactEmail: null,
    access: {
      mode: 'LINK',
      activationUrl: 'https://quipu.example/activate#token=abc',
      expiresAt: new Date(Date.now() + minutesLeft * MINUTE).toISOString(),
      emailSent: false,
      shareMessage: 'Hola, este es tu acceso: https://quipu.example/activate#token=abc',
    },
    regenerated: false,
    ...overrides,
  };
}

const PASSWORD = {
  mode: 'TEMPORARY_PASSWORD' as const,
  temporaryPassword: 'K7-q2x9m',
  expiresAt: '',
  emailSent: false,
  shareMessage: 'Entra con tu documento y la clave K7-q2x9m',
};

async function settle(harness: RouterTestingHarness) {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await harness.fixture.whenStable();
}

async function setup(given: AccessHandoff | null, copies = true) {
  const clipboard = { copy: vi.fn<(text: string) => boolean>(() => copies) };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'admin/guests', children: [] },
        { path: 'admin/guests/:id', children: [] },
        { path: 'admin/guests/:id/access', component: AccessComponent },
      ]),
      { provide: Clipboard, useValue: clipboard },
    ],
  });
  if (given) TestBed.inject(AccessHandoffService).put(given);
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/admin/guests/g1/access');
  await settle(harness);
  const root = () => harness.routeNativeElement ?? document.body;
  const page = () => within(root());
  const click = async (element: HTMLElement) => {
    fireEvent.click(element);
    await settle(harness);
  };
  const facts = () =>
    [...root().querySelectorAll('.summary app-fact-tile')].map((tile) => [
      squash(tile.querySelector('dt')?.textContent),
      squash(tile.querySelector('dd')?.textContent).replace(/\s/g, ' '),
    ]);
  const toast = () => squash(root().querySelector('app-toast output')?.textContent);
  return { harness, clipboard, page, root, click, facts, toast };
}

describe('AccessComponent (A3.7 «Acceso generado»)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a link with its countdown, the facts, the message and how to share it', async () => {
    const ui = await setup(handoff());

    expect(ui.page().getByRole('heading', { level: 1, name: 'Acceso generado' })).toBeTruthy();
    expect(ui.page().getByRole('link', { name: 'Volver a Huéspedes' }).getAttribute('href')).toBe(
      '/admin/guests',
    );
    expect(ui.facts()).toEqual([
      ['Huésped', 'DNI 70412233'],
      ['Tipo', 'Con contrato'],
      ['Entra con', 'Link'],
      ['Vence a las', expect.stringMatching(/^\d{1,2}:\d{2} [ap]\. m\.$/)],
    ]);
    const now = within(ui.page().getByRole('region', { name: 'Lo que toca ahora' }));
    expect(squash(now.getByRole('timer').textContent)).toMatch(/^(30:00|29:5\d)$/);
    expect(now.getByText('minutos para usarlo')).toBeTruthy();
    expect(squash(now.getByRole('status').textContent)).toBe(
      'Quedan 30 minutos o menos para usarlo.',
    );
    expect(
      now.getByText(
        'Compártelo ahora: copia el mensaje y envíaselo por donde te comuniques con el huésped. Al salir de esta pantalla ya no se puede volver a ver.',
      ),
    ).toBeTruthy();
    expect(now.queryByRole('link', { name: /Abrir WhatsApp/ })).toBeNull();
    expect(ui.page().getByRole('heading', { name: 'El link de activación' })).toBeTruthy();
    expect(ui.page().getByText('https://quipu.example/activate#token=abc')).toBeTruthy();
    expect(
      ui.page().getByText('Abre una página donde elige su contraseña. Sirve una sola vez.'),
    ).toBeTruthy();
    expect(ui.page().getByText(/^Hola, este es tu acceso:/)).toBeTruthy();
    // Without a phone the primary action copies the message; the section has no second copy.
    expect(ui.page().getAllByRole('button', { name: 'Copiar mensaje' })).toHaveLength(1);
    expect(ui.page().queryByText(/por correo/)).toBeNull();
    expect(
      ui.page().getByRole('link', { name: 'Ir a la ficha del huésped' }).getAttribute('href'),
    ).toBe('/admin/guests/g1');
    // TODO(TAR-288): A3.7 offers «Generar otro acceso» again once A3.2 can regenerate (piece 3).
    expect(ui.page().queryByRole('link', { name: 'Generar otro acceso' })).toBeNull();
  });

  it('copies the link and the message with the clipboard and says so', async () => {
    const ui = await setup(handoff());

    await ui.click(ui.page().getByRole('button', { name: 'Copiar link' }));
    expect(ui.clipboard.copy).toHaveBeenLastCalledWith('https://quipu.example/activate#token=abc');
    expect(ui.toast()).toBe('Link copiado.');

    await ui.click(ui.page().getByRole('button', { name: 'Copiar mensaje' }));
    expect(ui.clipboard.copy).toHaveBeenLastCalledWith(
      'Hola, este es tu acceso: https://quipu.example/activate#token=abc',
    );
    expect(ui.toast()).toBe('Mensaje copiado.');
  });

  it('says when the browser could not copy', async () => {
    const ui = await setup(handoff(), false);

    await ui.click(ui.page().getByRole('button', { name: 'Copiar link' }));
    expect(ui.toast()).toBe('No se pudo copiar. Selecciona el texto y cópialo a mano.');
  });

  it('hides the temporary password until «Mostrar clave» and copies it', async () => {
    const given = handoff();
    const ui = await setup({
      ...given,
      access: { ...PASSWORD, expiresAt: given.access.expiresAt },
    });

    expect(ui.page().getByRole('heading', { name: 'La clave temporal' })).toBeTruthy();
    expect(ui.facts()[2]).toEqual(['Entra con', 'Clave temporal']);
    const password = () => ui.root().querySelector('#access-password');
    expect(squash(password()?.textContent)).toBe('•••••••••Clave oculta');
    expect(ui.root().textContent).not.toContain('K7-q2x9m Sirve');
    const toggle = ui.page().getByRole('button', { name: 'Mostrar clave' });
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(toggle.getAttribute('aria-controls')).toBe('access-password');

    await ui.click(toggle);
    expect(squash(password()?.textContent)).toBe('K7-q2x9m');
    expect(
      ui.page().getByRole('button', { name: 'Ocultar clave' }).getAttribute('aria-pressed'),
    ).toBe('true');

    await ui.click(ui.page().getByRole('button', { name: 'Copiar clave' }));
    expect(ui.clipboard.copy).toHaveBeenLastCalledWith('K7-q2x9m');
    expect(ui.toast()).toBe('Clave copiada.');
    await ui.click(ui.page().getByRole('button', { name: 'Ocultar clave' }));
    expect(squash(password()?.textContent)).toBe('•••••••••Clave oculta');
  });

  it('hides the temporary password inside the message too, but copies and shares it whole', async () => {
    const given = handoff({ phone: '987 654 321' });
    const ui = await setup({
      ...given,
      access: { ...PASSWORD, expiresAt: given.access.expiresAt },
    });
    const message = () =>
      squash(
        within(ui.page().getByRole('region', { name: 'Mensaje para el huésped' })).getByText(
          /^Entra con tu documento/,
        ).textContent,
      );

    expect(message()).toBe('Entra con tu documento y la clave •••••••••');
    expect(ui.root().textContent).not.toContain('K7-q2x9m');
    expect(ui.page().getByRole('link', { name: 'Abrir WhatsApp' }).getAttribute('href')).toBe(
      `//wa.me/51987654321?text=${encodeURIComponent(PASSWORD.shareMessage)}`,
    );

    await ui.click(ui.page().getByRole('button', { name: 'Mostrar clave' }));
    expect(message()).toBe('Entra con tu documento y la clave K7-q2x9m');

    await ui.click(ui.page().getByRole('button', { name: 'Ocultar clave' }));
    expect(message()).toBe('Entra con tu documento y la clave •••••••••');
    const section = within(ui.page().getByRole('region', { name: 'Mensaje para el huésped' }));
    await ui.click(section.getByRole('button', { name: 'Copiar mensaje' }));
    expect(ui.clipboard.copy).toHaveBeenLastCalledWith(PASSWORD.shareMessage);
  });

  it('opens WhatsApp with the message when there is a phone, and says the email went out', async () => {
    const ui = await setup(
      handoff({
        phone: '987 654 321',
        contactEmail: 'ana@example.com',
        access: { ...handoff().access, emailSent: true },
      }),
    );

    const whatsapp = ui.page().getByRole('link', { name: 'Abrir WhatsApp' });
    expect(whatsapp.getAttribute('href')).toBe(
      `//wa.me/51987654321?text=${encodeURIComponent('Hola, este es tu acceso: https://quipu.example/activate#token=abc')}`,
    );
    expect(whatsapp.getAttribute('target')).toBe('_blank');
    expect(whatsapp.getAttribute('rel')).toBe('noopener');
    expect(
      ui
        .page()
        .getByText(
          /^Compártelo ahora: WhatsApp se abre con el mensaje ya escrito para el 987 654 321\./,
        ),
    ).toBeTruthy();
    // The copy of the message moves to the right of its title.
    const message = ui.page().getByRole('region', { name: 'Mensaje para el huésped' });
    expect(within(message).getByRole('button', { name: 'Copiar mensaje' })).toBeTruthy();
    const sent = ui.page().getByText('También se envió por correo a ana@example.com.');
    expect(sent.tagName).toBe('STRONG');
    expect(squash(sent.parentElement?.textContent)).toBe(
      'También se envió por correo a ana@example.com. Si no le llega, compártelo por WhatsApp o copia el mensaje.',
    );
  });

  it('says when the email could not be sent', async () => {
    const ui = await setup(handoff({ contactEmail: 'ana@example.com' }));

    const unsent = ui.page().getByText('No se pudo enviar el correo a ana@example.com.');
    expect(unsent.tagName).toBe('STRONG');
    expect(squash(unsent.parentElement?.textContent)).toBe(
      'No se pudo enviar el correo a ana@example.com. Compártelo de otra forma: copia el mensaje y envíaselo.',
    );
  });

  it('turns expired: red countdown, no secret, the guest page as the only action', async () => {
    const ui = await setup(handoff({ phone: '987 654 321' }, -1));

    const now = within(ui.page().getByRole('region', { name: 'Lo que toca ahora' }));
    expect(squash(now.getByRole('timer').textContent)).toBe('00:00');
    expect(ui.root().querySelector('.clock')?.classList.contains('expired')).toBe(true);
    expect(now.getByText('el acceso venció')).toBeTruthy();
    expect(squash(now.getByRole('status').textContent)).toBe('El acceso venció.');
    expect(
      now.getByText(
        'Nadie lo usó a tiempo. Genera otro desde su ficha y compártelo apenas lo tengas.',
      ),
    ).toBeTruthy();
    expect(now.getByRole('link', { name: 'Ir a la ficha del huésped' }).getAttribute('href')).toBe(
      '/admin/guests/g1',
    );
    expect(now.queryByRole('link', { name: 'Abrir WhatsApp' })).toBeNull();
    expect(ui.facts()[3]?.[0]).toBe('Venció a las');
    expect(ui.root().textContent).not.toContain('token=abc');
    expect(ui.page().getAllByRole('link', { name: 'Ir a la ficha del huésped' })).toHaveLength(1);
    expect(ui.page().queryByRole('link', { name: 'Generar otro acceso' })).toBeNull();
  });

  it('counts down with the clock and expires on screen', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    const ui = await setup(handoff({}, 2));
    const timer = () => squash(ui.page().getByRole('timer').textContent);
    expect(timer()).toBe('02:00');

    vi.advanceTimersByTime(61_000);
    await settle(ui.harness);
    expect(timer()).toBe('00:59');
    const now = within(ui.page().getByRole('region', { name: 'Lo que toca ahora' }));
    expect(squash(now.getByRole('status').textContent)).toBe(
      'Queda menos de 1 minuto para usarlo.',
    );

    vi.advanceTimersByTime(60_000);
    await settle(ui.harness);
    expect(timer()).toBe('00:00');
    expect(ui.page().getByText('el acceso venció')).toBeTruthy();
    expect(ui.page().queryByRole('button', { name: 'Copiar link' })).toBeNull();
  });

  it('shows nothing to show when there is no access in memory, as after a reload', async () => {
    const ui = await setup(null);

    expect(ui.page().getByText('No hay un acceso para mostrar.')).toBeTruthy();
    expect(ui.page().getByText(/genera otro desde su ficha/)).toBeTruthy();
    expect(
      ui.page().getByRole('link', { name: 'Ir a la ficha del huésped' }).getAttribute('href'),
    ).toBe('/admin/guests/g1');
    expect(
      ui
        .page()
        .getAllByRole('link', { name: 'Volver a Huéspedes' })
        .map((link) => link.getAttribute('href')),
    ).toEqual(['/admin/guests', '/admin/guests']);
    expect(ui.page().queryByRole('timer')).toBeNull();
  });

  it('shows the access only once: back on A3.7 there is nothing to show', async () => {
    const ui = await setup(handoff());
    expect(ui.page().getByRole('timer')).toBeTruthy();

    const router = TestBed.inject(Router);
    await router.navigateByUrl('/admin/guests/g1');
    await ui.harness.navigateByUrl('/admin/guests/g1/access');
    await settle(ui.harness);

    expect(ui.page().getByText('No hay un acceso para mostrar.')).toBeTruthy();
    expect(ui.root().textContent).not.toContain('token=abc');
  });

  it('ignores an access held for another guest', async () => {
    const ui = await setup(handoff({ guestId: 'g2' }));

    expect(ui.page().getByText('No hay un acceso para mostrar.')).toBeTruthy();
  });

  it('names a regenerated access and goes back to the guest', async () => {
    const ui = await setup(handoff({ regenerated: true }));

    expect(
      ui.page().getByRole('heading', { level: 1, name: 'Acceso nuevo generado' }),
    ).toBeTruthy();
    expect(
      ui.page().getByRole('link', { name: 'Volver a DNI 70412233' }).getAttribute('href'),
    ).toBe('/admin/guests/g1');
  });
});
