import type { components } from '@core/api/bff.generated';
import { environmentView, isOccupied, owedPayables, pendingDebtError } from '../data/account-views';
import { signedContract } from '../data/guest-views';
import { addDays, nowInstant, today } from '../data/mock-dates';
import { ID_KIND } from '../data/mock-db';
import type { Contract, GuestRecord, MockDb } from '../data/mock-db';
import { invalid, MockFailure, noContent, notFound, ok, paginate, raise } from '../mock-reply';
import type { MockRequest, MockRoute } from '../mock-types';

type Schemas = components['schemas'];
type ContractStatus = Contract['status'];

const STATUSES = new Set<unknown>(['ACTIVE', 'EXPIRED', 'TERMINATED']);
/** The PDF of a contract weighs 10 MB at most (RF-15). */
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MONEY = /^\d+(\.\d{1,2})?$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
/** A contract about to end: 30 days or fewer to its end date (RF-09, D-27). */
const SOON_DAYS = 30;

/** The state comes from the dates (RN-07): an active contract whose end passed is expired. */
function settle(db: MockDb): void {
  for (const contract of db.data.contracts) {
    if (contract.status === 'ACTIVE' && contract.endDate != null && contract.endDate < today()) {
      contract.status = 'EXPIRED';
    }
  }
}

function expiringSoon(contract: Contract): boolean {
  return (
    contract.status === 'ACTIVE' &&
    contract.endDate != null &&
    contract.endDate <= addDays(today(), SOON_DAYS)
  );
}

function summaryOf(contract: Contract): Schemas['ContractSummary'] {
  return {
    id: contract.id,
    environmentId: contract.environmentId,
    guestId: contract.guestId,
    guestName: contract.guestName,
    documentType: contract.documentType,
    documentNumber: contract.documentNumber,
    environmentCode: contract.environmentCode,
    environmentType: contract.environmentType,
    monthlyAmount: contract.monthlyAmount,
    paymentDay: contract.paymentDay,
    graceDays: contract.graceDays,
    startDate: contract.startDate,
    endDate: contract.endDate,
    status: contract.status,
    expiringSoon: expiringSoon(contract),
    terminatedAt: contract.terminatedAt,
  };
}

function detailOf(contract: Contract): Schemas['Contract'] {
  return { ...signedContract(contract), expiringSoon: expiringSoon(contract) };
}

function contractOf(db: MockDb, req: MockRequest): Contract {
  settle(db);
  return db.contract(req.params['id'] ?? '') ?? notFound();
}

/** The soonest end first; an open-ended contract last. */
const byEnd = (a: Contract, b: Contract): number =>
  (a.endDate ?? '9999-12-31').localeCompare(b.endDate ?? '9999-12-31') ||
  a.startDate.localeCompare(b.startDate);

function list(db: MockDb, req: MockRequest): Schemas['PagedContracts'] {
  settle(db);
  const status = req.query.get('status');
  if (status !== null && !STATUSES.has(status)) invalid('status');
  const soonOnly = req.query.get('expiringSoon');
  if (soonOnly !== null && soonOnly !== 'true' && soonOnly !== 'false') invalid('expiringSoon');
  if (soonOnly === 'true' && status !== null && status !== 'ACTIVE') invalid('expiringSoon');
  const wanted = (status ?? (soonOnly === 'true' ? 'ACTIVE' : null)) as ContractStatus | null;
  const contracts = db.data.contracts
    .filter((contract) => wanted === null || contract.status === wanted)
    .filter((contract) => soonOnly !== 'true' || expiringSoon(contract))
    .sort(byEnd);
  const page = paginate(contracts, req.query);
  return { content: page.content.map(summaryOf), nextCursor: page.nextCursor };
}

/** The multipart body of a new contract: its fields are text, the PDF is a file (RF-03, RF-15). */
function formOf(body: unknown): FormData {
  if (!(body instanceof FormData)) {
    return raise(
      415,
      'UNSUPPORTED_MEDIA_TYPE',
      'No se pudo enviar el formulario. Recarga la página e inténtalo de nuevo.',
    );
  }
  return body;
}

function textOf(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : invalid(name);
}

function wholeOf(form: FormData, name: string, min: number, max: number): number {
  const raw = textOf(form, name);
  const value = Number(raw);
  return /^\d{1,2}$/.test(raw) && value >= min && value <= max ? value : invalid(name);
}

function dayOf(form: FormData, name: string): string {
  const raw = textOf(form, name);
  return DAY.test(raw) && !Number.isNaN(Date.parse(raw)) ? raw : invalid(name);
}

function fileOf(form: FormData): File {
  const file = form.get('file');
  const isPdf = file instanceof File && file.type === 'application/pdf';
  if (!isPdf || file.size > MAX_FILE_BYTES) {
    return raise(
      400,
      'CONTRACT_INVALID_FILE',
      'El archivo debe ser un PDF de 10 MB como máximo.',
      'file',
    );
  }
  return file;
}

interface NewContract {
  readonly file: File;
  readonly environmentId: string;
  readonly guestId: string;
  readonly monthlyAmount: number;
  readonly paymentDay: number;
  readonly graceDays: number;
  readonly startDate: string;
  readonly endDate: string | null;
}

function newContractOf(body: unknown): NewContract {
  const form = formOf(body);
  const file = fileOf(form);
  const environmentId = textOf(form, 'environmentId');
  const guestId = textOf(form, 'guestId');
  const amount = textOf(form, 'monthlyAmount');
  if (!MONEY.test(amount) || Number(amount) <= 0) invalid('monthlyAmount');
  const paymentDay = wholeOf(form, 'paymentDay', 1, 31);
  const graceDays = wholeOf(form, 'graceDays', 0, 31);
  const startDate = dayOf(form, 'startDate');
  const given = form.get('endDate');
  const endDate = typeof given === 'string' && given !== '' ? dayOf(form, 'endDate') : null;
  if (endDate !== null && endDate <= startDate) {
    raise(
      400,
      'CONTRACT_INVALID_DATES',
      'La fecha de fin debe ser posterior a la de inicio.',
      'endDate',
    );
  }
  return {
    file,
    environmentId,
    guestId,
    monthlyAmount: Number(amount),
    paymentDay,
    graceDays,
    startDate,
    endDate,
  };
}

/** The guest checks come in the order of the contract: state, type, debt (RN-35, RN-13, RN-25). */
function checkGuest(db: MockDb, guest: GuestRecord): void {
  if (guest.status !== 'ACTIVE') {
    raise(409, 'GUEST_NOT_ACTIVE', 'El huésped no está activo.');
  }
  if (guest.type !== 'CONTRACT') {
    raise(409, 'GUEST_NOT_CONTRACT', 'Solo un huésped de contrato toma un contrato.');
  }
  const owed = owedPayables(db, guest.id);
  if (owed.length > 0) {
    throw new MockFailure({ status: 409, body: pendingDebtError(owed) });
  }
}

/** Then the environment: inactive, then occupied in those dates (RF-01, RN-20). */
function checkEnvironment(db: MockDb, input: NewContract): void {
  const environment = db.environment(input.environmentId);
  if (environment === undefined) {
    raise(404, 'ENVIRONMENT_NOT_FOUND', 'El ambiente no existe.');
  }
  if (environment.status !== 'ACTIVE') {
    raise(409, 'ENVIRONMENT_INACTIVE', 'El ambiente está inactivo.');
  }
  const range = { from: input.startDate, to: input.endDate ?? '9999-12-31' };
  if (isOccupied(db, environment.id, range)) {
    const view = environmentView(db, environment);
    throw new MockFailure({
      status: 409,
      body: {
        code: 'ENVIRONMENT_OCCUPIED',
        message: 'El ambiente ya está ocupado en esas fechas',
        occupant: view.occupant ?? view.nextOccupant ?? undefined,
      },
    });
  }
}

function create(db: MockDb, body: unknown): Contract {
  settle(db);
  const input = newContractOf(body);
  const guest = db.guest(input.guestId);
  if (guest === undefined) {
    raise(404, 'GUEST_NOT_FOUND', 'El huésped no existe.');
  }
  const environment = db.environment(input.environmentId);
  if (environment === undefined) {
    raise(404, 'ENVIRONMENT_NOT_FOUND', 'El ambiente no existe.');
  }
  checkGuest(db, guest);
  checkEnvironment(db, input);
  const contract: Contract = {
    id: db.newId(ID_KIND.contract),
    environmentId: environment.id,
    guestId: guest.id,
    guestName: guest.name,
    documentType: guest.documentType,
    documentNumber: guest.documentNumber,
    environmentCode: environment.code,
    environmentType: environment.type,
    monthlyAmount: input.monthlyAmount,
    paymentDay: input.paymentDay,
    graceDays: input.graceDays,
    startDate: input.startDate,
    endDate: input.endDate,
    status: 'ACTIVE',
    expiringSoon: false,
    terminatedAt: null,
    file: { name: input.file.name, sizeBytes: input.file.size, uploadedAt: nowInstant() },
    fileUrl: null,
  };
  db.data.contracts.push(contract);
  return contract;
}

/** Finalizing frees the environment from today and keeps the debt; repeating it changes nothing. */
function terminate(contract: Contract): void {
  if (contract.status === 'TERMINATED') return;
  Object.assign(contract, { status: 'TERMINATED', terminatedAt: today() });
}

/** The contracts of the administrator (A4, A4.1 to A4.3). */
export const ADMIN_CONTRACT_ROUTES: readonly MockRoute[] = [
  {
    key: 'GET /bff/admin/contracts',
    handler: (req, ctx) => {
      ctx.requireAdmin();
      return ok(list(ctx.db, req));
    },
  },
  {
    key: 'POST /bff/admin/contracts',
    handler: (req, ctx) => {
      ctx.requireAdmin();
      return ok(detailOf(create(ctx.db, req.body)), 201);
    },
  },
  {
    key: 'GET /bff/admin/contracts/{id}',
    handler: (req, ctx) => {
      ctx.requireAdmin();
      return ok(detailOf(contractOf(ctx.db, req)));
    },
  },
  {
    key: 'POST /bff/admin/contracts/{id}/terminate',
    handler: (req, ctx) => {
      ctx.requireAdmin();
      terminate(contractOf(ctx.db, req));
      return noContent();
    },
  },
];
