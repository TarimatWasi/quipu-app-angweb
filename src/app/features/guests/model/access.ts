import type { AccessGrant } from '@core/api/clients/admin-guests.service';
import type { AccessMode } from './new-guest';

/** A3.7 «Acceso generado» (RN-32) as the canvas «Acceso» words it. */

const LIMA_TIME = new Intl.DateTimeFormat('es-PE', {
  timeZone: 'America/Lima',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

/** The time of day an access expires in Lima, «11:42 a. m.»; null when the instant is not valid. */
export function limaTime(instant: string): string | null {
  const date = new Date(instant);
  return Number.isNaN(date.getTime()) ? null : LIMA_TIME.format(date);
}

/** Milliseconds left until `expiresAt`, never below 0; 0 when the instant is not valid. */
export function remainingMs(expiresAt: string, now: number): number {
  const end = Date.parse(expiresAt);
  return Number.isNaN(end) ? 0 : Math.max(end - now, 0);
}

/** The countdown, «29:41»: whole minutes and seconds, the seconds rounded up. */
export function countdownText(remaining: number): string {
  const seconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

// What a screen reader hears: only when the time crosses one of these marks, never every second.
const MARKS = [1, 5, 10, 15, 20, 25, 30] as const;
export const EXPIRED_ANNOUNCEMENT = 'El acceso venció.';

/** The sentence the live region says; it changes only at the marks, so it is announced seldom. */
export function countdownAnnouncement(remaining: number): string {
  if (remaining <= 0) return EXPIRED_ANNOUNCEMENT;
  const minutes = Math.ceil(remaining / 60_000);
  const mark = MARKS.find((each) => minutes <= each);
  if (mark === undefined) return `Quedan ${String(minutes)} minutos para usarlo.`;
  return mark === 1
    ? 'Queda menos de 1 minuto para usarlo.'
    : `Quedan ${String(mark)} minutos o menos para usarlo.`;
}

// The country code a phone without a prefix gets: the residence is in Peru.
const LOCAL_PREFIX = '51';
// An external link, not a BFF call (FE-ANG-HTTP-01): relative to the scheme of the page, which is
// https wherever Quipu is served.
const WHATSAPP = '//wa.me';

/**
 * «Abrir WhatsApp»: wa.me with the number in digits only (a number without + gets the Peruvian
 * prefix, as the help of A3.1 tells the administrator) and the message already written.
 */
export function whatsappUrl(phone: string, message: string): string {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, '');
  const number = trimmed.startsWith('+') ? digits : `${LOCAL_PREFIX}${digits}`;
  return `${WHATSAPP}/${number}?text=${encodeURIComponent(message)}`;
}

/** The secret of an access: the link or the temporary password. */
export function accessSecret(access: AccessGrant): string {
  return access.mode === 'LINK' ? access.activationUrl : access.temporaryPassword;
}

/** The temporary password while it is hidden: always 9 dots, so its length never shows. */
export const HIDDEN_PASSWORD = '•••••••••';

export interface AccessTexts {
  readonly sectionTitle: string;
  readonly copyLabel: string;
  readonly copiedText: string;
  readonly help: string;
}

export const ACCESS_TEXTS: Readonly<Record<AccessMode, AccessTexts>> = {
  LINK: {
    sectionTitle: 'El link de activación',
    copyLabel: 'Copiar link',
    copiedText: 'Link copiado.',
    help: 'Abre una página donde elige su contraseña. Sirve una sola vez.',
  },
  TEMPORARY_PASSWORD: {
    sectionTitle: 'La clave temporal',
    copyLabel: 'Copiar clave',
    copiedText: 'Clave copiada.',
    help: 'Entra con su número de documento y esta clave, y luego elige su contraseña. Sirve una sola vez.',
  },
};

export const MESSAGE_COPIED_TEXT = 'Mensaje copiado.';
export const COPY_FAILED_TEXT = 'No se pudo copiar. Selecciona el texto y cópialo a mano.';
export const LEAVE_TEXT = ' Al salir de esta pantalla ya no se puede volver a ver.';
export const EXPIRED_CONTEXT_TEXT =
  'Nadie lo usó a tiempo. Genera otro y compártelo apenas lo tengas.';

/** «Compártelo ahora: …», with the phone WhatsApp opens for, or the message to copy without one. */
export function shareContext(phone: string | null): string {
  const how =
    phone === null
      ? 'copia el mensaje y envíaselo por donde te comuniques con el huésped.'
      : `WhatsApp se abre con el mensaje ya escrito para el ${phone}.`;
  return `Compártelo ahora: ${how}${LEAVE_TEXT}`;
}

export interface EmailNotice {
  readonly heading: string;
  readonly text: string;
}

/** The yellow notice when the access also went, or could not go, by email; null without an email. */
export function emailNotice(contactEmail: string | null, emailSent: boolean): EmailNotice | null {
  if (contactEmail === null) return null;
  return emailSent
    ? {
        heading: `También se envió por correo a ${contactEmail}.`,
        text: 'Si no le llega, compártelo por WhatsApp o copia el mensaje.',
      }
    : {
        heading: `No se pudo enviar el correo a ${contactEmail}.`,
        text: 'Compártelo de otra forma: copia el mensaje y envíaselo.',
      };
}
