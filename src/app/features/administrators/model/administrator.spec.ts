import { countsOf, hasRoom, sinceText, toRow } from './administrator';
import type { AdministratorSummary } from './administrator';
import {
  changeProblem,
  countLine,
  createProblem,
  DNI_TEXT,
  DOCUMENT_FORMAT_TEXT,
  DOCUMENT_NUMBER_TEXT,
  documentNumberError,
  pendingSummary,
} from './administrator-texts';

// 2026-11-05 10:00 in Lima (UTC-5).
const NOW = new Date('2026-11-05T15:00:00Z');

function admin(overrides: Partial<AdministratorSummary> = {}): AdministratorSummary {
  return {
    id: 'a1',
    name: 'Rosa Quispe',
    documentType: 'DNI',
    documentNumber: '*****678',
    email: 'rosa@example.com',
    status: 'ACTIVE',
    createdAt: '2026-01-15T14:00:00Z',
    self: false,
    ...overrides,
  };
}

describe('administrator rows (A7)', () => {
  it('shows an active administrator with its name, abbreviated document, green badge and «Desactivar»', () => {
    expect(toRow(admin(), NOW)).toEqual({
      id: 'a1',
      name: 'Rosa Quispe',
      displayName: 'Rosa Quispe',
      self: false,
      document: 'DNI *****678',
      email: 'rosa@example.com',
      badge: { label: 'Activo', tone: 'paid' },
      since: '15 ene 2026',
      action: 'deactivate',
    });
  });

  it('calls an active account without name «Sin activar» in yellow, named by its email, and offers «Desactivar»', () => {
    const row = toRow(admin({ name: null, documentType: 'CE', documentNumber: '******321' }), NOW);

    expect(row.badge).toEqual({ label: 'Sin activar', tone: 'review' });
    expect(row.displayName).toBe('rosa@example.com');
    expect(row.document).toBe('CE ******321');
    expect(row.action).toBe('deactivate');
  });

  it('shows an inactive one in grey with «Reactivar», a passport as «Pasaporte»', () => {
    const row = toRow(admin({ status: 'INACTIVE', documentType: 'PASSPORT' }), NOW);

    expect(row.badge).toEqual({ label: 'Inactivo', tone: 'unpaid' });
    expect(row.document).toBe('Pasaporte *****678');
    expect(row.action).toBe('reactivate');
  });

  it('gives the own account no action', () => {
    expect(toRow(admin({ self: true }), NOW).action).toBeNull();
  });

  it('says «hoy» for an account created today in Lima, even past midnight in UTC', () => {
    // 2026-11-05 22:30 in Lima is already the 6th in UTC.
    const lateNow = new Date('2026-11-06T03:30:00Z');
    expect(sinceText('2026-11-05T13:00:00Z', lateNow)).toBe('hoy');
    expect(sinceText('2026-11-05T04:00:00Z', NOW)).toBe('4 nov 2026');
    expect(sinceText('not a date', NOW)).toBe('—');
  });
});

describe('counts and texts of A7', () => {
  const list = [
    admin({ id: 'a1', self: true }),
    admin({ id: 'a2', name: null, email: 'nuevo@example.com' }),
    admin({ id: 'a3', status: 'INACTIVE' }),
    admin({ id: 'a4', status: 'INACTIVE', name: null }),
  ];

  it('counts every account, the active ones (pending included) and only the active pending ones', () => {
    const counts = countsOf(list);

    expect(counts.total).toBe(4);
    expect(counts.active).toBe(2);
    expect(counts.pending.map((pending) => pending.id)).toEqual(['a2']);
    expect(countLine(counts)).toBe('4 de 5 administradores · 2 activos');
    expect(countLine(countsOf([admin()]))).toBe('1 de 5 administradores · 1 activo');
  });

  it('counts against the maximum of active ones once there are more than 5 accounts', () => {
    const accounts = (active: number, inactive: number) => [
      ...Array.from({ length: active }, (_, n) => admin({ id: `on${String(n)}` })),
      ...Array.from({ length: inactive }, (_, n) =>
        admin({ id: `off${String(n)}`, status: 'INACTIVE' }),
      ),
    ];
    expect(countLine(countsOf(accounts(3, 2)))).toBe('5 de 5 administradores · 3 activos');
    expect(countLine(countsOf(accounts(4, 2)))).toBe('6 administradores · 4 de 5 activos');
    expect(countLine(countsOf(accounts(1, 5)))).toBe('6 administradores · 1 de 5 activo');
  });

  it('has room until the fifth active one, inactive ones do not count', () => {
    const four = Array.from({ length: 4 }, (_, n) => admin({ id: `a${String(n)}` }));
    const withInactive = [...four, admin({ id: 'off', status: 'INACTIVE' })];
    expect(hasRoom(countsOf(withInactive))).toBe(true);
    expect(hasRoom(countsOf([...four, admin({ id: 'a5', name: null })]))).toBe(false);
  });

  it('«Lo que toca ahora» names the one account not yet activated', () => {
    expect(pendingSummary(countsOf(list))).toEqual({
      figure: '1 sin activar',
      heading: 'nuevo@example.com aún no activa su cuenta',
      text: 'Le enviamos un enlace de 30 minutos. Si venció, que entre a «¿Olvidaste tu contraseña?» con ese correo para recibir otro. Aparecerá con su nombre cuando active la cuenta.',
    });
  });

  it('counts several accounts not yet activated in the plural', () => {
    const two = [admin({ id: 'b1', name: null }), admin({ id: 'b2', name: null })];
    const summary = pendingSummary(countsOf(two));
    expect(summary.figure).toBe('2 sin activar');
    expect(summary.heading).toBe('2 cuentas aún no se activan');
  });

  it('says nothing is pending with the number of active accounts', () => {
    expect(pendingSummary(countsOf([admin(), admin({ id: 'a2' })]))).toEqual({
      figure: '2 activos',
      heading: 'Nada pendiente',
      text: 'Todas las cuentas creadas ya están activas.',
    });
    expect(pendingSummary(countsOf([admin()])).figure).toBe('1 activo');
  });
});

describe('the document check of the new administrator (FE-ANG-FRM-03)', () => {
  it('asks for a number, 8 digits for a DNI and letters, digits or hyphen for the others', () => {
    expect(documentNumberError('DNI', '   ')).toBe(DOCUMENT_NUMBER_TEXT);
    expect(documentNumberError('DNI', '1234567')).toBe(DNI_TEXT);
    expect(documentNumberError('DNI', '1234567a')).toBe(DNI_TEXT);
    expect(documentNumberError('DNI', ' 12345678 ')).toBeNull();
    expect(documentNumberError('CE', '00-12AB')).toBeNull();
    expect(documentNumberError('PASSPORT', 'AB 123')).toBe(DOCUMENT_FORMAT_TEXT);
    expect(documentNumberError('PASSPORT', 'A'.repeat(21))).toBe(DOCUMENT_FORMAT_TEXT);
  });
});

describe('where each error of A7 goes (QP-ANGWEB-BFF-02)', () => {
  const error = (code: string, field?: string) => ({
    code,
    message: 'catálogo',
    ...(field ? { field } : {}),
  });

  it('puts the failures of the new administrator under their field, the maximum above and the rest below', () => {
    expect(createProblem(error('AUTH_INVALID_CREDENTIALS', 'currentPassword'))).toEqual({
      place: 'field',
      field: 'currentPassword',
      message: 'Tu contraseña no es correcta.',
    });
    expect(createProblem(error('ACCOUNT_DOCUMENT_TAKEN', 'documentNumber'))).toEqual({
      place: 'field',
      field: 'documentNumber',
      message: 'Ese documento ya pertenece a una cuenta',
    });
    expect(createProblem(error('ACCOUNT_EMAIL_TAKEN', 'email'))).toEqual({
      place: 'field',
      field: 'email',
      message: 'Ese correo ya está en uso por otra cuenta',
    });
    expect(createProblem(error('ADMIN_LIMIT_REACHED'))).toEqual({
      place: 'top',
      message: 'Ya hay 5 administradores, el máximo. Desactiva uno antes de crear otro.',
    });
    expect(createProblem(error('VALIDATION_ERROR', 'email'))).toEqual({
      place: 'field',
      field: 'email',
      message: 'catálogo',
    });
    expect(createProblem(error('VALIDATION_ERROR', 'currentPassword'))).toEqual({
      place: 'field',
      field: 'currentPassword',
      message: 'Revisa tu contraseña.',
    });
    expect(createProblem(error('VALIDATION_ERROR', 'documentType'))).toEqual({
      place: 'bottom',
      message: 'catálogo',
    });
    expect(createProblem(error('RATE_LIMITED'))).toEqual({ place: 'bottom', message: 'catálogo' });
  });

  it('puts the conflicts of a deactivation or a reactivation above, with texts of their own', () => {
    expect(changeProblem(error('AUTH_INVALID_CREDENTIALS', 'currentPassword'))).toEqual({
      place: 'field',
      field: 'currentPassword',
      message: 'Tu contraseña no es correcta.',
    });
    expect(changeProblem(error('ADMIN_SELF_DEACTIVATION'))).toEqual({
      place: 'top',
      message: 'No puedes desactivar tu propia cuenta.',
    });
    expect(changeProblem(error('LAST_ACTIVE_ADMIN'))).toEqual({
      place: 'top',
      message:
        'Es el único administrador activo: Quipu siempre necesita al menos uno. Crea o reactiva otro antes de desactivarlo.',
    });
    expect(changeProblem(error('ADMIN_LIMIT_REACHED'))).toEqual({
      place: 'top',
      message:
        'Ya hay 5 administradores activos, el máximo. Desactiva uno antes de reactivar a otro.',
    });
    expect(changeProblem(error('ADMIN_NOT_FOUND')).place).toBe('top');
    expect(changeProblem(error('RATE_LIMITED'))).toEqual({ place: 'bottom', message: 'catálogo' });
  });
});
