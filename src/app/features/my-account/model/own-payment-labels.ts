/** How the guest sees the state of one of its payments (H3 «Tu pago», H4). */
export const PAYMENT_STATUS_LABELS: Readonly<Record<'PENDING' | 'APPROVED' | 'REJECTED', string>> =
  {
    PENDING: 'Pendiente de revisión',
    APPROVED: 'Aprobado',
    REJECTED: 'Rechazado',
  };
