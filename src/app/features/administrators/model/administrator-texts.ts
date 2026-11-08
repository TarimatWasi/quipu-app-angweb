import { loadErrorText } from '@shared/text/list-text';
import type { BffError } from '@core/http/bff-error';
import { MAX_ACTIVE_ADMINISTRATORS } from './administrator';
import type { AdministratorAction, AdministratorCounts, DocumentType } from './administrator';

/** Texts of A7 as the canvas «Administradores» words them, Spanish only (QP-ANGWEB-LNG-01). */

const MAX = String(MAX_ACTIVE_ADMINISTRATORS);

export const LOAD_ERROR_TEXT = loadErrorText('la lista de administradores');
export const ROOM_HELP_TEXT = `Puedes tener hasta ${MAX}.`;
export const FULL_HELP_TEXT = `Ya hay ${MAX}, el máximo. Desactiva uno para crear otro.`;
export const FOOTER_TEXT =
  'Todos los administradores pueden lo mismo. Cada alta, baja o reactivación se avisa por correo a los demás administradores activos.';

export const PENDING_LINK_TEXT =
  'Le enviamos un enlace de 30 minutos. Si venció, que entre a «¿Olvidaste tu contraseña?» con ese correo para recibir otro. Aparecerá con su nombre cuando active la cuenta.';
export const NOTHING_PENDING_TEXT = 'Nada pendiente';
export const ALL_ACTIVE_TEXT = 'Todas las cuentas creadas ya están activas.';

export const CREATED_TEXT = 'Administrador creado. Le enviamos el enlace a su correo.';
export const DEACTIVATED_TEXT = 'Administrador desactivado.';
export const REACTIVATED_TEXT = 'Administrador reactivado.';
export const EMAIL_NOT_SENT_HEADING = 'Creamos la cuenta, pero no pudimos enviar el correo.';

/** «Pídele que entre a … con <correo>»: what to do when the link could not be emailed. */
export function emailNotSentText(email: string): string {
  return `Pídele que entre a «¿Olvidaste tu contraseña?» con ${email}: le llegará el enlace para activar su cuenta.`;
}

function activeWord(count: number): string {
  return count === 1 ? 'activo' : 'activos';
}

/**
 * «4 de 5 administradores · 3 activos». The maximum counts only the active ones, so with more than
 * 5 accounts (inactive ones included) it says «6 administradores · 4 de 5 activos» instead.
 */
export function countLine({ total, active }: AdministratorCounts): string {
  if (total > MAX_ACTIVE_ADMINISTRATORS) {
    return `${String(total)} administradores · ${String(active)} de ${MAX} ${activeWord(active)}`;
  }
  return `${String(total)} de ${MAX} administradores · ${String(active)} ${activeWord(active)}`;
}

/** «Lo que toca ahora»: the figure, the key sentence and the explanation. */
export interface PendingSummary {
  readonly figure: string;
  readonly heading: string;
  readonly text: string;
}

export function pendingSummary({ active, pending }: AdministratorCounts): PendingSummary {
  const [first] = pending;
  if (first === undefined) {
    return {
      figure: `${String(active)} ${activeWord(active)}`,
      heading: NOTHING_PENDING_TEXT,
      text: ALL_ACTIVE_TEXT,
    };
  }
  return {
    figure: `${String(pending.length)} sin activar`,
    heading:
      pending.length === 1
        ? `${first.email} aún no activa su cuenta`
        : `${String(pending.length)} cuentas aún no se activan`,
    text: PENDING_LINK_TEXT,
  };
}

// The new administrator dialog.
export const NEW_ADMIN_LEAD =
  'Podrá hacer todo lo que haces tú. Escribe su documento y el correo al que le llegará el enlace.';
export const EMAIL_HELP_TEXT =
  'Le enviaremos un enlace de 30 minutos para que escriba su nombre y elija su contraseña.';
export const PASSWORD_HELP_TEXT = 'Para confirmar que eres tú.';

/** As the segmented control names each type. */
export const DOCUMENT_TYPE_OPTIONS: readonly { value: DocumentType; label: string }[] = [
  { value: 'DNI', label: 'DNI' },
  { value: 'CE', label: 'Carné de extranjería' },
  { value: 'PASSPORT', label: 'Pasaporte' },
];

// Client checks, the same as the contract's (FE-ANG-FRM-03).
export const DOCUMENT_NUMBER_TEXT = 'Escribe el número de documento.';
export const DNI_TEXT = 'El DNI tiene 8 dígitos.';
export const DOCUMENT_FORMAT_TEXT = 'Usa solo letras, números o guion, hasta 20.';
export const EMAIL_TEXT = 'Ingresa un correo válido';
export const PASSWORD_TEXT = 'Escribe tu contraseña.';
export const MAX_EMAIL_LENGTH = 200;
export const MAX_PASSWORD_LENGTH = 128;
export const EMAIL_LENGTH_TEXT = `Máximo ${String(MAX_EMAIL_LENGTH)} caracteres`;
export const PASSWORD_LENGTH_TEXT = `Máximo ${String(MAX_PASSWORD_LENGTH)} caracteres`;

/** The local check of a document number (as A3.1 and A3.5), or null when it is valid. */
export function documentNumberError(type: DocumentType, number: string): string | null {
  const value = number.trim();
  if (value === '') return DOCUMENT_NUMBER_TEXT;
  if (type === 'DNI') return /^\d{8}$/.test(value) ? null : DNI_TEXT;
  return /^[A-Za-z0-9-]{1,20}$/.test(value) ? null : DOCUMENT_FORMAT_TEXT;
}

// Texts that depend on these dialogs: the catalog's speak of the login or of another screen.
export const WRONG_PASSWORD_TEXT = 'Tu contraseña no es correcta.';
export const PASSWORD_VALIDATION_TEXT = 'Revisa tu contraseña.';
export const DOCUMENT_TAKEN_TEXT = 'Ese documento ya pertenece a una cuenta';
export const EMAIL_TAKEN_TEXT = 'Ese correo ya está en uso por otra cuenta';
export const CREATE_LIMIT_TEXT = `Ya hay ${MAX} administradores, el máximo. Desactiva uno antes de crear otro.`;
export const REACTIVATE_LIMIT_TEXT = `Ya hay ${MAX} administradores activos, el máximo. Desactiva uno antes de reactivar a otro.`;
export const SELF_DEACTIVATION_TEXT = 'No puedes desactivar tu propia cuenta.';
export const LAST_ACTIVE_TEXT =
  'Es el único administrador activo: Quipu siempre necesita al menos uno. Crea o reactiva otro antes de desactivarlo.';
export const NOT_FOUND_TEXT =
  'Ese administrador ya no está en la lista. Ciérralo y vuelve a cargarla.';

/** The texts of the deactivation and the reactivation dialogs. */
export interface ChangeTexts {
  readonly title: string;
  readonly lead: string;
  readonly button: string;
  readonly busyButton: string;
  readonly done: string;
}

export function changeTexts(action: AdministratorAction, who: string): ChangeTexts {
  return action === 'deactivate'
    ? {
        title: `¿Desactivar a ${who}?`,
        lead: 'Dejará de entrar a Quipu desde ahora, aunque tenga la sesión abierta. Lo que hizo se conserva y puedes reactivarlo cuando quieras.',
        button: 'Desactivar',
        busyButton: 'Desactivando…',
        done: DEACTIVATED_TEXT,
      }
    : {
        title: `¿Reactivar a ${who}?`,
        lead: 'Podrá entrar a Quipu de nuevo desde ahora, con su documento y la contraseña que tenía.',
        button: 'Reactivar',
        busyButton: 'Reactivando…',
        done: REACTIVATED_TEXT,
      };
}

/** The fields of the new administrator a server error can point at. */
export type CreateField = 'documentNumber' | 'email' | 'currentPassword';

/**
 * Where a failure goes in a dialog: under a field, as the red notice above the form (what blocks
 * the action whatever is typed) or under the form (try again later).
 */
export type DialogProblem =
  | { readonly place: 'field'; readonly field: CreateField; readonly message: string }
  | { readonly place: 'top'; readonly message: string }
  | { readonly place: 'bottom'; readonly message: string };

function passwordProblem({ code }: BffError): DialogProblem {
  const message = code === 'VALIDATION_ERROR' ? PASSWORD_VALIDATION_TEXT : WRONG_PASSWORD_TEXT;
  return { place: 'field', field: 'currentPassword', message };
}

const CREATE_FIELD_TEXTS = new Map<string, { field: CreateField; message: string }>([
  ['ACCOUNT_DOCUMENT_TAKEN', { field: 'documentNumber', message: DOCUMENT_TAKEN_TEXT }],
  ['ACCOUNT_EMAIL_TAKEN', { field: 'email', message: EMAIL_TAKEN_TEXT }],
]);

function isCreateField(field: string | undefined): field is CreateField {
  return field === 'documentNumber' || field === 'email' || field === 'currentPassword';
}

/** Decided by `code` and `field`, never by the server's text (QP-ANGWEB-BFF-02). */
export function createProblem(error: BffError): DialogProblem {
  const { code, field, message } = error;
  if (code === 'AUTH_INVALID_CREDENTIALS' || field === 'currentPassword') {
    return passwordProblem(error);
  }
  const taken = CREATE_FIELD_TEXTS.get(code);
  if (taken) return { place: 'field', ...taken };
  if (code === 'ADMIN_LIMIT_REACHED') return { place: 'top', message: CREATE_LIMIT_TEXT };
  if (code === 'VALIDATION_ERROR' && isCreateField(field)) {
    return { place: 'field', field, message };
  }
  return { place: 'bottom', message };
}

const CHANGE_CONFLICTS = new Map<string, string>([
  ['ADMIN_LIMIT_REACHED', REACTIVATE_LIMIT_TEXT],
  ['ADMIN_SELF_DEACTIVATION', SELF_DEACTIVATION_TEXT],
  ['LAST_ACTIVE_ADMIN', LAST_ACTIVE_TEXT],
  ['ADMIN_NOT_FOUND', NOT_FOUND_TEXT],
]);

/** The same for the deactivation and the reactivation, whose only field is the password. */
export function changeProblem(error: BffError): DialogProblem {
  if (error.code === 'AUTH_INVALID_CREDENTIALS' || error.field === 'currentPassword') {
    return passwordProblem(error);
  }
  const conflict = CHANGE_CONFLICTS.get(error.code);
  return conflict
    ? { place: 'top', message: conflict }
    : { place: 'bottom', message: error.message };
}
