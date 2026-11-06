// Test helpers of the simulated BFF: an HttpClient wired to the mock interceptor without delay.
import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, Observable } from 'rxjs';
import { DEMO_CLAVE, DEMO_USERS } from './data/demo-users';
import type { DemoUserKey } from './data/demo-users';
import { MOCK_LATENCY, MockBff } from './mock-bff';
import { mockBffInterceptor } from './mock-bff.interceptor';
import type { MockScenario } from './mock-scenarios';
import { writeMockSetting } from './mock-storage';

export interface MockHarness {
  readonly bff: MockBff;
  readonly http: HttpClient;
  readonly backend: HttpTestingController;
  get<T>(url: string, params?: Record<string, string | number>): Promise<T>;
  send<T>(method: 'POST' | 'PUT' | 'PATCH', url: string, body: unknown): Promise<T>;
  /** The error of a call that must fail. */
  fail(call: Promise<unknown>): Promise<HttpErrorResponse>;
  signIn(key: DemoUserKey): Promise<unknown>;
}

/** Forgets the role, the scenario and the password change kept by a previous test. */
export function resetMockSettings(): void {
  writeMockSetting('quipu-mock:role', null);
  writeMockSetting('quipu-mock:scenario', null);
  writeMockSetting('quipu-mock:password', null);
  writeMockSetting('quipu-mock:requests', null);
  writeMockSetting('quipu-mock:presentation', null);
}

export function setUpMockBff(scenario: MockScenario = 'normal'): MockHarness {
  resetMockSettings();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([mockBffInterceptor])),
      provideHttpClientTesting(),
      { provide: MOCK_LATENCY, useValue: { normalMs: 0, slowMs: 0 } },
    ],
  });
  const bff = TestBed.inject(MockBff);
  bff.setScenario(scenario);
  const http = TestBed.inject(HttpClient);
  const call = <T>(observable: Observable<T>) => firstValueFrom(observable);
  const harness: MockHarness = {
    bff,
    http,
    backend: TestBed.inject(HttpTestingController),
    get: (url, params) =>
      call(http.get<never>(url, { params: new HttpParams({ fromObject: params }) })),
    send: (method, url, body) => call(http.request<never>(method, url, { body })),
    fail: (promise) =>
      promise.then(
        () => {
          throw new Error('the call was expected to fail');
        },
        (error: unknown) => {
          if (!(error instanceof HttpErrorResponse)) {
            throw error;
          }
          return error;
        },
      ),
    signIn: (key) => {
      const user = DEMO_USERS[key];
      return harness.send('POST', '/bff/auth/login', {
        documentType: user.documentType,
        documentNumber: user.documentNumber,
        password: DEMO_CLAVE,
      });
    },
  };
  return harness;
}

/** Stands for any Spanish text of the catalog: the tests check the shape, not the wording. */
export const SOME_TEXT = '<texto>';

/**
 * The body of a failed call, with a non-empty `message` reduced to {@link SOME_TEXT}: comparing it
 * with `{ code, message: SOME_TEXT, field? }` checks the whole shape of the catalog error.
 */
export function catalogOf(error: HttpErrorResponse): Record<string, unknown> {
  const body = { ...(error.error as Record<string, unknown>) };
  const message = body['message'];
  if (typeof message === 'string' && message.trim() !== '') {
    body['message'] = SOME_TEXT;
  }
  return body;
}

/** A multipart body like the services send: the proofs as a JSON part, then the files. */
export function proofsForm(
  proofs: readonly object[],
  files: readonly File[] = [],
  fields: Readonly<Record<string, string>> = {},
): FormData {
  const body = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    body.append(name, value);
  }
  body.append('proofs', new Blob([JSON.stringify(proofs)], { type: 'application/json' }));
  for (const file of files) {
    body.append('files', file, file.name);
  }
  return body;
}

export function voucherFile(name = 'voucher.jpg', type = 'image/jpeg'): File {
  return new File(['fake image bytes'], name, { type });
}
