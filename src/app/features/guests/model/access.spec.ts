import {
  accessSecret,
  countdownAnnouncement,
  countdownText,
  emailNotice,
  EXPIRED_ANNOUNCEMENT,
  limaTime,
  remainingMs,
  shareContext,
  whatsappUrl,
} from './access';

const NBSP = /\s/g;

describe('A3.7 model', () => {
  it('writes the expiry as the time of day in Lima', () => {
    expect(limaTime('2026-11-05T16:42:00Z')?.replace(NBSP, ' ')).toBe('11:42 a. m.');
    expect(limaTime('2026-11-05T03:05:00Z')?.replace(NBSP, ' ')).toBe('10:05 p. m.');
    expect(limaTime('mañana')).toBeNull();
  });

  it('counts down from expiresAt and never below zero', () => {
    const now = Date.parse('2026-11-05T16:12:00Z');
    expect(remainingMs('2026-11-05T16:42:00Z', now)).toBe(30 * 60_000);
    expect(remainingMs('2026-11-05T16:00:00Z', now)).toBe(0);
    expect(remainingMs('nunca', now)).toBe(0);
    expect(countdownText(30 * 60_000)).toBe('30:00');
    expect(countdownText(29 * 60_000 + 40_100)).toBe('29:41');
    expect(countdownText(500)).toBe('00:01');
    expect(countdownText(0)).toBe('00:00');
  });

  it('announces only at a few marks, not every second', () => {
    expect(countdownAnnouncement(29 * 60_000 + 59_000)).toBe(
      'Quedan 30 minutos o menos para usarlo.',
    );
    expect(countdownAnnouncement(25 * 60_000 + 1000)).toBe(
      'Quedan 30 minutos o menos para usarlo.',
    );
    expect(countdownAnnouncement(25 * 60_000)).toBe('Quedan 25 minutos o menos para usarlo.');
    expect(countdownAnnouncement(4 * 60_000 + 10_000)).toBe(
      'Quedan 5 minutos o menos para usarlo.',
    );
    expect(countdownAnnouncement(59_000)).toBe('Queda menos de 1 minuto para usarlo.');
    expect(countdownAnnouncement(0)).toBe(EXPIRED_ANNOUNCEMENT);
    const texts = new Set(
      Array.from({ length: 1800 }, (_, second) => countdownAnnouncement(second * 1000)),
    );
    expect(texts.size).toBe(8);
  });

  it('opens WhatsApp with the number in digits and the message already written', () => {
    expect(whatsappUrl('987 654-321', 'Hola: a&b')).toBe(
      '//wa.me/51987654321?text=Hola%3A%20a%26b',
    );
    expect(whatsappUrl(' +34 612 345 678 ', 'x')).toBe('//wa.me/34612345678?text=x');
  });

  it('picks the secret of each mode', () => {
    const common = { expiresAt: 'x', emailSent: false, shareMessage: 'm' };
    expect(accessSecret({ ...common, mode: 'LINK', activationUrl: 'https://q/a' })).toBe(
      'https://q/a',
    );
    expect(accessSecret({ ...common, mode: 'TEMPORARY_PASSWORD', temporaryPassword: 'k1' })).toBe(
      'k1',
    );
  });

  it('tells how to share it, with or without a phone', () => {
    expect(shareContext('987 654 321')).toBe(
      'Compártelo ahora: WhatsApp se abre con el mensaje ya escrito para el 987 654 321. Al salir de esta pantalla ya no se puede volver a ver.',
    );
    expect(shareContext(null)).toBe(
      'Compártelo ahora: copia el mensaje y envíaselo por donde te comuniques con el huésped. Al salir de esta pantalla ya no se puede volver a ver.',
    );
  });

  it('says whether the email went out, and nothing without an email', () => {
    expect(emailNotice(null, false)).toBeNull();
    expect(emailNotice('ana@example.com', true)).toEqual({
      heading: 'También se envió por correo a ana@example.com.',
      text: 'Si no le llega, compártelo por WhatsApp o copia el mensaje.',
    });
    expect(emailNotice('ana@example.com', false)).toEqual({
      heading: 'No se pudo enviar el correo a ana@example.com.',
      text: 'Compártelo de otra forma: copia el mensaje y envíaselo.',
    });
  });
});
