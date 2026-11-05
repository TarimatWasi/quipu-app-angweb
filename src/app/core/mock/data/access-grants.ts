import type { components } from '@core/api/bff.generated';
import type { GuestRecord } from './mock-db';
import { UNSENT_EMAIL_MARK } from './seed-administrators';

type Schemas = components['schemas'];

/** How long an access lasts (RN-32). */
export const ACCESS_MINUTES = 30;

/**
 * An access for a guest, with made-up secrets, valid 30 minutes (RN-32). It goes by email when
 * there is one, unless the address carries «sin-envio».
 */
export function accessGrant(
  guest: GuestRecord,
  mode: Schemas['AccessMode'],
  email: string | null | undefined,
): Schemas['AccessGrant'] {
  const expiresAt = new Date(Date.now() + ACCESS_MINUTES * 60_000).toISOString();
  const emailSent = typeof email === 'string' && !email.toLowerCase().includes(UNSENT_EMAIL_MARK);
  if (mode === 'LINK') {
    const activationUrl = `${globalThis.location.origin}/activate#token=demo-${guest.id.slice(-4)}`;
    const shareMessage = `Hola, este es tu acceso a Quipu: ${activationUrl}\nÁbrelo en los próximos 30 minutos para elegir tu contraseña. Sirve una sola vez.`;
    return { mode: 'LINK', activationUrl, expiresAt, emailSent, shareMessage };
  }
  const temporaryPassword = `demo-${guest.id.slice(-4)}`;
  const shareMessage = `Hola, entra a Quipu con tu número de documento y esta clave temporal: ${temporaryPassword}\nVence en 30 minutos y sirve una sola vez; luego eliges tu contraseña.`;
  return { mode: 'TEMPORARY_PASSWORD', temporaryPassword, expiresAt, emailSent, shareMessage };
}
