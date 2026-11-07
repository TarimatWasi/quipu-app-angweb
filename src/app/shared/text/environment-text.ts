/** How an environment is named for people (A3.2, A4, H2): «Habitación 201», «Cabaña C1». */

export type EnvironmentType = 'ROOM' | 'CABIN';

export const ENVIRONMENT_TYPE_LABELS: Readonly<Record<EnvironmentType, string>> = {
  ROOM: 'Habitación',
  CABIN: 'Cabaña',
};

export function environmentLabel(type: EnvironmentType, code: string): string {
  return `${ENVIRONMENT_TYPE_LABELS[type]} ${code}`;
}
