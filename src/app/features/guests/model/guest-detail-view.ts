import { loadErrorText } from '@shared/text/list-text';
import type { GuestDetail, PeriodStatus } from '@core/api/clients/admin-guests.service';
import type { DetailPanel } from './detail-panel';

export type LoadState = 'loading' | 'ready' | 'not-found' | 'error';
/** What the left column shows: the months, the stays, the activation still to do, or nothing. */
export type LeftColumn = 'periods' | 'stays' | 'blocked' | 'none';

export interface DetailView {
  readonly guest: GuestDetail;
  readonly panel: DetailPanel;
  readonly left: LeftColumn;
}

export const LOAD_ERROR_TEXT = loadErrorText('el huésped');
/** How often the panel looks at the clock again (minutes left of an access). */
export const CLOCK_MS = 15_000;

export function leftColumn(guest: GuestDetail, periods: readonly PeriodStatus[]): LeftColumn {
  if (guest.status === 'PENDING_ACTIVATION' || guest.status === 'ONBOARDING') return 'blocked';
  if (guest.type === 'TEMPORARY') return 'stays';
  return guest.status === 'ACTIVE' || periods.length > 0 ? 'periods' : 'none';
}

/** Whether the guest has months or stays to read besides its detail. */
export function chargesKind(guest: GuestDetail): 'periods' | 'stays' | null {
  if (guest.status !== 'ACTIVE' && guest.status !== 'INACTIVE') return null;
  return guest.type === 'CONTRACT' ? 'periods' : 'stays';
}
