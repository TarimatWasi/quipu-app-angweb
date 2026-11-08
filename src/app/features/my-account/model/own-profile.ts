import type { components } from '@core/api/bff.generated';
import type { CallFailure } from '@shared/forms/call-failure';
import { toEmergencyContact } from '@shared/forms/personal-data';
import type { EmergencyContact, PersonalData } from '@shared/forms/personal-data';
import { formatDate, formatMoney, formatStay } from '@shared/payments/payment-format';
import { documentLabel } from '@shared/text/document-text';
import type { DocumentType } from '@shared/text/document-text';
import { environmentLabel } from '@shared/text/environment-text';
import type { EnvironmentType } from '@shared/text/environment-text';
import { NETWORK_TEXT, STORAGE_UNAVAILABLE_TEXT } from '@shared/text/error-text';

type Contract = components['schemas']['Contract'];

/** H5 and T3 «Mis datos» (CU-20, CU-23, RN-17), as the canvas «MisDatos» words them. */

export const PROFILE_TITLE = 'Mis datos';
export const LOAD_PROFILE_TEXT = 'No se pudieron cargar tus datos.';
export const SAVED_TEXT = 'Datos actualizados.';
export const DOCUMENT_UPLOADED_TEXT = 'Documento subido.';
export const DEAL_NOTE =
  'Lo registra la administración. Si algo no está bien, avísale para que lo corrija.';
export const NO_DOCUMENTS_TEXT = 'Aún no subiste documentos.';
export const UPLOAD_NOTE = 'Una vez subido no lo puedes borrar ni cambiar.';
export const CHANGE_PASSWORD_LABEL = 'Cambiar contraseña';

export const ACCOUNT_EMAIL_LABEL =
  'Correo de tu cuenta (para recuperar tu contraseña; lo cambia la administración)';
export const NO_ACCOUNT_EMAIL =
  'Sin correo: si olvidas tu contraseña, pídele a la administración un acceso nuevo';

const DOCUMENT_GONE_TEXT = 'Ese documento ya no está disponible.';
const UNEXPECTED_OPEN_TEXT = 'No se pudo abrir el documento. Inténtalo de nuevo.';
export const CANNOT_CLEAR_TEXT =
  'Por ahora no se puede quitar un dato guardado: cámbialo por otro.';

export function uploadHelp(limit: number): string {
  return `JPG, PNG o PDF de hasta 5 MB, hasta ${String(limit)} en total. Si necesitas cambiar o borrar uno, pídeselo a la administración.`;
}

// What the administration keeps about the guest, read only (the left column).

export interface DealFact {
  readonly label: string;
  readonly value: string;
  /** Takes the whole row of the grid (long values: the dates and the document). */
  readonly wide: boolean;
}

export interface DealView {
  /** «Tu contrato» or «Tu estadía». */
  readonly title: string;
  readonly facts: readonly DealFact[];
  /** Offers «Ver mi contrato»: only the guest with a contract that has one. */
  readonly contractLink: boolean;
}

/** The stay of a temporary guest, as far as the BFF gives it (T1). */
export interface StayDeal {
  readonly startDate: string;
  readonly endDate: string;
  readonly agreedAmount: number;
  /** Null for an old stay without environment (TAR-304): the tile is left out. */
  readonly environment?: { readonly type: EnvironmentType; readonly code: string };
}

interface ProfileIdentity {
  readonly documentType: DocumentType;
  readonly documentNumber: string;
  readonly accountEmail: string | null;
}

function common(profile: ProfileIdentity): DealFact[] {
  return [
    {
      label: 'Documento',
      value: documentLabel(profile.documentType, profile.documentNumber),
      wide: true,
    },
    {
      label: ACCOUNT_EMAIL_LABEL,
      value: profile.accountEmail ?? NO_ACCOUNT_EMAIL,
      // A long label and an address do not fit half a row.
      wide: true,
    },
  ];
}

/** «Tu contrato»: the environment, the fee, the dates and the payment day (H5). */
export function contractDeal(profile: ProfileIdentity, contract: Contract | null): DealView {
  const facts: DealFact[] =
    contract === null
      ? []
      : [
          {
            label: 'Ambiente',
            value: environmentLabel(contract.environmentType, contract.environmentCode),
            wide: false,
          },
          { label: 'Cuota', value: formatMoney(contract.monthlyAmount), wide: false },
          {
            label: 'Contrato',
            value: `${formatDate(contract.startDate)} – ${
              contract.endDate ? formatDate(contract.endDate) : 'sin fecha de fin'
            }`,
            wide: true,
          },
          {
            label: 'Día de pago',
            value: `${String(contract.paymentDay)} de cada mes`,
            wide: false,
          },
        ];
  return {
    title: 'Tu contrato',
    facts: [...facts, ...common(profile)],
    contractLink: contract !== null,
  };
}

/** «Tu estadía»: the environment (when known), the agreed amount and the dates (T3). */
export function stayDeal(profile: ProfileIdentity, stay: StayDeal | null): DealView {
  const facts: DealFact[] =
    stay === null
      ? []
      : [
          ...(stay.environment
            ? [
                {
                  label: 'Ambiente',
                  value: environmentLabel(stay.environment.type, stay.environment.code),
                  wide: false,
                },
              ]
            : []),
          { label: 'Acordado', value: formatMoney(stay.agreedAmount), wide: false },
          { label: 'Estadía', value: formatStay(stay.startDate, stay.endDate), wide: true },
        ];
  return { title: 'Tu estadía', facts: [...facts, ...common(profile)], contractLink: false };
}

// The documents the guest has uploaded: their rows are the shared ones (shared/text/file-text).

/** What the toast says when a document cannot be opened; a missing one also reloads the list. */
export function openProblem({ status }: CallFailure): { message: string; reload: boolean } {
  if (status === 404) return { message: DOCUMENT_GONE_TEXT, reload: true };
  if (status === 503) return { message: STORAGE_UNAVAILABLE_TEXT, reload: false };
  if (status === 0) return { message: NETWORK_TEXT, reload: false };
  return { message: UNEXPECTED_OPEN_TEXT, reload: false };
}

// Saving the data.

type ProfileUpdate = components['schemas']['ProfileUpdateInput'];

const trimmed = (data: PersonalData): PersonalData => ({
  name: data.name.trim(),
  phone: data.phone.trim(),
  contactEmail: data.contactEmail.trim(),
  emergencyName: data.emergencyName.trim(),
  emergencyRelationship: data.emergencyRelationship.trim(),
  emergencyPhone: data.emergencyPhone.trim(),
});

/** Whether the form differs from what is saved, ignoring spaces at the ends. */
export function isDirty(current: PersonalData, saved: PersonalData): boolean {
  const now = trimmed(current);
  const was = trimmed(saved);
  return (Object.keys(now) as (keyof PersonalData)[]).some((key) => now[key] !== was[key]);
}

/**
 * Whether an optional piece the guest had saved was emptied. The BFF keeps the value of what is
 * not sent and does not take an empty one, so it cannot be removed: the screen says so.
 */
export function clearsSaved(current: PersonalData, saved: PersonalData): boolean {
  const now = trimmed(current);
  const was = trimmed(saved);
  const optional = [
    'contactEmail',
    'emergencyName',
    'emergencyRelationship',
    'emergencyPhone',
  ] as const;
  return optional.some((key) => was[key] !== '' && now[key] === '');
}

function sameContact(a: EmergencyContact | null, b: EmergencyContact | null): boolean {
  return (
    (a?.name ?? '') === (b?.name ?? '') &&
    (a?.relationship ?? '') === (b?.relationship ?? '') &&
    (a?.phone ?? '') === (b?.phone ?? '')
  );
}

/** The body of the PATCH: only what changed (RN-17), trimmed; null when nothing can be sent. */
export function toProfileUpdate(current: PersonalData, saved: PersonalData): ProfileUpdate | null {
  const now = trimmed(current);
  const was = trimmed(saved);
  const contact = toEmergencyContact(now);
  const changes: ProfileUpdate = {
    ...(now.name !== was.name && { name: now.name }),
    ...(now.phone !== was.phone && { phone: now.phone }),
    ...(now.contactEmail !== was.contactEmail &&
      now.contactEmail !== '' && { contactEmail: now.contactEmail }),
    ...(contact !== null &&
      !sameContact(contact, toEmergencyContact(was)) && { emergencyContact: contact }),
  };
  return Object.keys(changes).length > 0 ? changes : null;
}
