import type { GuestDetail } from '@core/api/clients/admin-guests.service';

/** A3.2 «Más acciones»: what else can be done with this guest, each one with its hint. */

export type DialogActionKind = 'generate-access' | 'account-email' | 'deactivate' | 'reactivate';

export type MoreAction =
  | { readonly kind: DialogActionKind; readonly label: string; readonly hint: string | null }
  | {
      readonly kind: 'link';
      readonly label: string;
      readonly hint: string | null;
      readonly link: readonly string[];
    };

export interface MoreActionsInput {
  readonly guest: GuestDetail;
  /** The panel already offers «Generar otro acceso»: it is not repeated here. */
  readonly panelGenerates: boolean;
  readonly owes: boolean;
}

/** «no subió documentos», «1 documento», «3 documentos». */
export function documentsHint(count: number): string {
  if (count <= 0) return 'no subió documentos';
  return count === 1 ? '1 documento' : `${String(count)} documentos`;
}

function accessActions(guest: GuestDetail, panelGenerates: boolean): MoreAction[] {
  const actions: MoreAction[] = [];
  if (!panelGenerates) {
    const hint = guest.status === 'ACTIVE' ? 'si olvidó su contraseña' : null;
    actions.push({ kind: 'generate-access', label: 'Generar otro acceso', hint });
  }
  actions.push({
    kind: 'account-email',
    label: 'Cambiar correo de cuenta',
    hint: 'al que llega la recuperación de contraseña',
  });
  return actions;
}

export function moreActions({ guest, panelGenerates, owes }: MoreActionsInput): MoreAction[] {
  const inactive = guest.status === 'INACTIVE';
  const actions = inactive ? [] : accessActions(guest, panelGenerates);
  actions.push({
    kind: 'link',
    label: 'Ver documentos',
    hint: documentsHint(guest.documentCount),
    link: ['/admin/guests', guest.id, 'documents'],
  });
  if (guest.status === 'PENDING_ACTIVATION') {
    actions.push({
      kind: 'link',
      label: 'Corregir documento',
      hint: 'solo hasta que active su acceso',
      link: ['/admin/guests', guest.id, 'document'],
    });
  }
  actions.push(
    inactive
      ? {
          kind: 'reactivate',
          label: 'Reactivar huésped',
          hint: owes ? 'después de saldar su deuda' : null,
        }
      : { kind: 'deactivate', label: 'Desactivar huésped', hint: null },
  );
  return actions;
}
