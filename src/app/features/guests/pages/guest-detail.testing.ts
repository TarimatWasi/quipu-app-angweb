// Fixtures and the harness the specs of A3.2 share.
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { fireEvent, within } from '@testing-library/dom';
import { Observable, of } from 'rxjs';
import { vi } from 'vitest';
import { AdminGuestsService } from '@core/api/clients/admin-guests.service';
import type {
  AccessGrant,
  GuestDetail,
  PeriodStatus,
  Stay,
} from '@core/api/clients/admin-guests.service';
import { GuestPaymentsService } from '../data/guest-payments.service';
import type { GuestPaymentsPage, PaymentSummary } from '../data/guest-payments.service';
import { GuestDetailComponent } from './guest-detail.component';
import { ToastService } from '@shared/ui/toast/toast.service';

export const squash = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim();

/** The link whose text (the hidden part included) is exactly `text`. */
export function linkReading(container: HTMLElement, text: string): HTMLElement {
  const link = within(container)
    .getAllByRole('link')
    .find((each) => squash(each.textContent) === text);
  if (link === undefined) throw new Error(`no link reads «${text}»`);
  return link;
}

/** The text of an element as it reads, a space between the texts of its pieces. */
export function words(element: Element): string {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const texts: string[] = [];
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    texts.push(node.textContent ?? '');
  }
  return squash(texts.join(' '));
}

export function httpError(status: number, body: object | null = null): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: body, statusText: 'Error' });
}

type Contract = NonNullable<GuestDetail['contract']>;

export function contractOf(status: Contract['status'] = 'ACTIVE'): Contract {
  return {
    id: 'c1',
    environmentId: 'e1',
    guestId: 'g1',
    guestName: 'Luis Huamán',
    documentType: 'DNI',
    documentNumber: '70412233',
    environmentCode: '201',
    environmentType: 'ROOM',
    monthlyAmount: 800,
    paymentDay: 5,
    graceDays: 3,
    startDate: '2026-07-01',
    endDate: '2027-06-30',
    status,
    expiringSoon: false,
    terminatedAt: null,
    file: { name: 'contrato.pdf', sizeBytes: 1, uploadedAt: '2026-07-01T10:00:00Z' },
    fileUrl: null,
  };
}

export function guestOf(fields: Record<string, unknown> = {}): GuestDetail {
  return {
    id: 'g1',
    documentType: 'DNI',
    documentNumber: '70412233',
    name: 'Luis Huamán',
    type: 'CONTRACT',
    hasLoginAccess: true,
    phone: '987 654 321',
    email: 'luis@example.com',
    documentCount: 2,
    paymentHistory: [],
    status: 'ACTIVE',
    onboardingProgress: 'COMPLETED',
    contract: contractOf(),
    ...fields,
  };
}

export function month(
  period: string,
  status: PeriodStatus['status'],
  extra: Partial<PeriodStatus> = {},
) {
  return {
    period,
    status,
    dueDate: `${period}-05`,
    amount: 800,
    creditApplied: 0,
    amountDue: 800,
    contractId: 'c1',
    paymentId: null,
    rejectionReason: null,
    ...extra,
  };
}

export const MONTHS: PeriodStatus[] = [
  month('2026-07', 'PAID', { paymentId: 'p7' }),
  month('2026-08', 'PAID', { paymentId: 'p8' }),
  month('2026-09', 'UNPAID'),
  month('2026-10', 'OVERDUE', { paymentId: 'p10', rejectionReason: 'El voucher no se lee' }),
  month('2026-11', 'UNDER_REVIEW', { paymentId: 'p11' }),
];

export function stayOf(fields: Partial<Stay> = {}): Stay {
  return {
    id: 's1',
    environmentId: 'e1',
    environmentCode: 'C1',
    startDate: '2026-10-20',
    endDate: '2026-10-31',
    agreedAmount: 480,
    paymentStatus: 'UNDER_REVIEW',
    paymentId: 'p1',
    version: 1,
    ...fields,
  };
}

export const GRANT: AccessGrant = {
  mode: 'TEMPORARY_PASSWORD',
  temporaryPassword: 'K7-q2x9m',
  expiresAt: '2026-11-05T21:30:00Z',
  emailSent: true,
  shareMessage: 'Entra con K7-q2x9m',
};

/** One payment of the history of A3.2 (PaymentSummary), approved unless told otherwise. */
export function paymentOf(fields: Partial<PaymentSummary> = {}): PaymentSummary {
  return {
    id: 'p1',
    guestId: 'g1',
    contractId: 'c1',
    stayId: null,
    period: '2026-09',
    amount: 800,
    verifiedAmount: 800,
    status: 'APPROVED',
    rejectionReason: null,
    proofCount: 1,
    voucherCount: 1,
    hasCash: false,
    reviewedAt: '2026-09-06T15:00:00Z',
    submittedAt: '2026-09-05T15:00:00Z',
    createdAt: '2026-09-05T15:00:00Z',
    ...fields,
  } as PaymentSummary;
}

export const NO_PAYMENTS: GuestPaymentsPage = { content: [], nextCursor: null };

interface Answers {
  /** The pages of «Historial de pagos», by the cursor asked (null is the first page). */
  payments?: (after: string | null) => Observable<GuestPaymentsPage>;
  detail?: Observable<GuestDetail>;
  months?: PeriodStatus[];
  stays?: Stay[];
  state?: Record<string, unknown>;
}

export async function settle(harness: RouterTestingHarness) {
  await new Promise((resolve) => setTimeout(resolve, 0));
  // A resource keeps the app unstable while it reads: tick instead of waiting for it.
  TestBed.tick();
  harness.detectChanges();
}

export function serviceOf(answers: Answers) {
  return {
    get: vi.fn<(id: string) => Observable<GuestDetail>>(() => answers.detail ?? of(guestOf())),
    accountStatus: vi.fn<(id: string) => Observable<PeriodStatus[]>>(() =>
      of(answers.months ?? MONTHS),
    ),
    allStays: vi.fn<(id: string) => Observable<Stay[]>>(() => of(answers.stays ?? [stayOf()])),
    deactivate: vi.fn<(id: string) => Observable<unknown>>(() => of(null)),
    reactivate: vi.fn<(id: string) => Observable<unknown>>(() =>
      of({ id: 'g1', status: 'ACTIVE' }),
    ),
    generateAccess: vi.fn<(id: string, mode: string) => Observable<AccessGrant>>(() => of(GRANT)),
    setAccountEmail: vi.fn<(id: string, email: string) => Observable<unknown>>(() => of(null)),
  };
}

export function paymentsServiceOf(answers: Answers) {
  return {
    page: vi.fn<(id: string, after?: string | null) => Observable<GuestPaymentsPage>>(
      (_id, after = null) => answers.payments?.(after) ?? of(NO_PAYMENTS),
    ),
  };
}

/** The routes A3.2 links to and the doubles of its two services. */
function providersOf(
  service: ReturnType<typeof serviceOf>,
  paymentsService: ReturnType<typeof paymentsServiceOf>,
) {
  return [
    provideRouter([
      { path: 'admin/guests', children: [] },
      { path: 'admin/guests/:id', component: GuestDetailComponent },
      { path: 'admin/guests/:id/access', children: [] },
      { path: 'admin/guests/:id/document', children: [] },
      { path: 'admin/guests/:id/stays/new', children: [] },
      { path: 'admin/guests/:id/stays/:stayId', children: [] },
      { path: 'admin/payments/new', children: [] },
      { path: 'admin/payments/:id', children: [] },
    ]),
    { provide: AdminGuestsService, useValue: service },
    { provide: GuestPaymentsService, useValue: paymentsService },
    { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
  ];
}

export async function setup(answers: Answers = {}) {
  const service = serviceOf(answers);
  const paymentsService = paymentsServiceOf(answers);
  TestBed.configureTestingModule({ providers: providersOf(service, paymentsService) });
  const harness = await RouterTestingHarness.create();
  const router = TestBed.inject(Router);
  await router.navigateByUrl('/admin/guests/g1', { state: answers.state });
  await settle(harness);
  const root = () => harness.routeNativeElement ?? document.body;
  const page = () => within(root());
  const click = async (element: HTMLElement) => {
    fireEvent.click(element);
    await settle(harness);
  };
  const panel = () => page().getByRole('region', { name: 'Lo que toca ahora' });
  const toast = () => TestBed.inject(ToastService).current()?.text ?? '';
  const facts = (title: string) =>
    [...page().getByRole('region', { name: title }).querySelectorAll('app-fact-tile')].map(
      (tile) => [
        squash(tile.querySelector('dt')?.textContent),
        squash(tile.querySelector('dd')?.textContent),
      ],
    );
  const more = () =>
    [...page().getByRole('region', { name: 'Más acciones' }).querySelectorAll('li')].map((li) =>
      words(li),
    );
  return {
    harness,
    service,
    paymentsService,
    router,
    root,
    page,
    click,
    panel,
    toast,
    facts,
    more,
  };
}
