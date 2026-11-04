/** The views of A5 as they travel in the address (`?vista=`), from A5 to A5.2 and back. */
export const QUEUE_VIEW_PARAMS = ['por-revisar', 'aprobados', 'rechazados'] as const;
export type QueueViewParam = (typeof QUEUE_VIEW_PARAMS)[number];

export function isQueueView(value: string): value is QueueViewParam {
  return (QUEUE_VIEW_PARAMS as readonly string[]).includes(value);
}
