import { ADMIN_REVIEWER, DEMO_USERS } from './demo-users';
import { addDays, instantOn, today } from './mock-dates';
import { ID_KIND, mockId } from './mock-db';
import type { AdministratorRecord } from './mock-db';

/** An email that contains this is created without sending its link (`emailSent: false`). */
export const UNSENT_EMAIL_MARK = 'sin-envio';

/**
 * The administrators of A7 (RF-22): the demo session («Tú»), another active one, an inactive one
 * and one that has not activated its account yet. Every name, document and email is made up.
 */
export function seedAdministrators(): AdministratorRecord[] {
  const demo = DEMO_USERS.admin;
  return [
    {
      id: ADMIN_REVIEWER.id,
      name: ADMIN_REVIEWER.name,
      documentType: demo.documentType,
      documentNumber: demo.documentNumber,
      email: 'rosa.quispe@example.com',
      status: 'ACTIVE',
      createdAt: '2026-01-15T14:00:00Z',
    },
    {
      id: mockId(ID_KIND.admin, 2),
      name: 'Julio César Mamani Apaza',
      documentType: 'CE',
      documentNumber: '001987654',
      email: 'julio.mamani@example.com',
      status: 'ACTIVE',
      createdAt: '2026-03-02T16:30:00Z',
    },
    {
      id: mockId(ID_KIND.admin, 3),
      name: 'Carmen Rosa Huanca Flores',
      documentType: 'PASSPORT',
      documentNumber: 'PE7788123',
      email: 'carmen.huanca@example.com',
      status: 'INACTIVE',
      createdAt: '2026-05-20T15:00:00Z',
    },
    {
      id: mockId(ID_KIND.admin, 4),
      name: null,
      documentType: 'DNI',
      documentNumber: '45678912',
      email: 'nuevo.admin@example.com',
      status: 'ACTIVE',
      createdAt: instantOn(addDays(today(), -1)),
    },
  ];
}
