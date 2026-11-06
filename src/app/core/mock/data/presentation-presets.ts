import { ID_KIND, mockId } from './mock-db';
import type { MockDbData } from './mock-db';

export const PRESENTATION_PRESETS = {
  standard: 'Datos habituales',
  long: 'Textos largos',
  many: 'Muchos pagos (paginación)',
  empty: 'Sin pagos',
} as const;
export type PresentationPreset = keyof typeof PRESENTATION_PRESETS;
export function isPresentationPreset(value: string): value is PresentationPreset {
  return Object.hasOwn(PRESENTATION_PRESETS, value);
}

/** Layout-only fixtures retain contract-shaped records and all normal data by default. */
export function presentationData(data: MockDbData, preset: PresentationPreset): MockDbData {
  if (preset === 'empty') return { ...data, payments: [], refunds: [], credits: new Map() };
  if (preset === 'long')
    return {
      ...data,
      guests: data.guests.map((guest) => ({
        ...guest,
        name: guest.name === null ? null : `${guest.name} de la Cruz Fernández Montenegro`,
      })),
      payments: data.payments.map((payment) => ({
        ...payment,
        rejectionReason:
          payment.rejectionReason === null
            ? null
            : 'El comprobante no permite distinguir la fecha, el destinatario ni el importe completo. Adjunta una imagen legible donde se vean todos los datos y vuelve a enviarlo para su revisión.',
      })),
    };
  if (preset !== 'many') return data;
  const sample = data.payments.find((payment) => payment.status === 'PENDING');
  if (sample === undefined) return data;
  const extra = Array.from({ length: 35 }, (_, index) => ({
    ...structuredClone(sample),
    id: mockId(ID_KIND.payment, 100_000 + index),
    proofs: sample.proofs.map((proof, proofIndex) => ({
      ...structuredClone(proof),
      id: mockId(ID_KIND.proof, 100_000 + index * 10 + proofIndex),
    })),
  }));
  return { ...data, payments: [...data.payments, ...extra] };
}
