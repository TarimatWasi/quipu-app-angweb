import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { fireEvent, within } from '@testing-library/dom';
import { ChangeResourcesService } from '@core/changes/change-resources.service';
import { ToastService } from '@shared/ui/toast/toast.service';
import { environment } from '../../../environments/environment';
import type { NotificationAudience } from './notification-link';
import { NotificationBellComponent } from './notification-bell.component';
import type { Notification, PagedNotifications } from './notifications.client';

const BFF = `${environment.bffBaseUrl}/bff`;
const PAYMENT = '00000005-0000-f000-c000-000000000001';

@Component({ selector: 'app-page-stub', template: '' })
class PageStubComponent {}

function notification(fields: Partial<Notification> & Pick<Notification, 'id'>): Notification {
  return {
    type: 'PAYMENT_PROOF_SUBMITTED',
    title: 'Comprobante por revisar',
    body: 'Luis envió un comprobante de pago.',
    createdAt: '2026-11-25T14:00:00Z',
    readAt: null,
    target: { kind: 'PAYMENT', id: PAYMENT },
    ...fields,
  };
}

const FIRST: PagedNotifications = {
  content: [
    notification({ id: 'n1' }),
    notification({
      id: 'n2',
      type: 'HOUSE_ANNOUNCEMENT',
      title: 'Aviso de la casa',
      body: 'Mañana no hay agua de 9 a 11.',
      target: null,
    }),
    notification({ id: 'n3', title: 'Registro completo', readAt: '2026-11-24T10:00:00Z' }),
  ],
  nextCursor: 'c2',
  unreadCount: 5,
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

async function setup(audience: NotificationAudience = 'ADMIN') {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'admin/payments/:id', component: PageStubComponent },
        { path: '**', component: PageStubComponent },
      ]),
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });
  const fixture = TestBed.createComponent(NotificationBellComponent);
  fixture.componentRef.setInput('audience', audience);
  await fixture.whenStable();
  const http = TestBed.inject(HttpTestingController);
  const root = fixture.nativeElement as HTMLElement;
  const stable = async () => {
    await settle();
    await fixture.whenStable();
  };
  return { fixture, http, root, ui: within(root), stable };
}

function openBell(root: HTMLElement): void {
  const bell = root.querySelector<HTMLElement>('button.bell');
  if (!bell) throw new Error('no bell');
  fireEvent.click(bell);
}

const bellLabel = (root: HTMLElement) =>
  root.querySelector('button.bell')?.getAttribute('aria-label');

describe('NotificationBellComponent (contract v0.27.0)', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('reads the first page and says the unread count of the account', async () => {
    const { http, root, stable } = await setup();
    http.expectOne(`${BFF}/admin/notifications`).flush(FIRST);
    await stable();
    expect(bellLabel(root)).toBe('Notificaciones, 5 sin leer');
    expect(root.querySelector('.count')?.textContent.trim()).toBe('5');
  });

  it('reads the guest inbox for a guest', async () => {
    const { http, root, stable } = await setup('CONTRACT');
    http.expectOne(`${BFF}/guest/notifications`).flush({ ...FIRST, unreadCount: 12 });
    await stable();
    expect(root.querySelector('.count')?.textContent.trim()).toBe('9+');
  });

  it('reads the temporary guest inbox in its own area and hears guest.notifications', async () => {
    const { http, root, stable } = await setup('TEMPORARY');
    http.expectOne(`${BFF}/temporary-guest/notifications`).flush({ ...FIRST, unreadCount: 1 });
    await stable();
    expect(bellLabel(root)).toBe('Notificaciones, 1 sin leer');
    TestBed.inject(ChangeResourcesService).changed(['guest.notifications']);
    await stable();
    http.expectOne(`${BFF}/temporary-guest/notifications`).flush(FIRST);
    await stable();
  });

  it('shows the server text, also of a type it does not know, and only links rows with a page', async () => {
    const { http, root, ui, stable } = await setup();
    http.expectOne(`${BFF}/admin/notifications`).flush(FIRST);
    await stable();
    openBell(root);
    await stable();
    expect(ui.getByRole('heading', { name: 'Notificaciones' })).toBeTruthy();
    expect(ui.getByText('Mañana no hay agua de 9 a 11.')).toBeTruthy();
    const link = ui.getByRole('link', { name: /Comprobante por revisar/ });
    expect(link.getAttribute('href')).toBe(`/admin/payments/${PAYMENT}`);
    expect(ui.getByRole('button', { name: /Aviso de la casa/ })).toBeTruthy();
    expect(root.querySelectorAll('.unread')).toHaveLength(2);
  });

  it('opening a row marks it read in this tab and goes to its page', async () => {
    const { http, root, ui, stable } = await setup();
    http.expectOne(`${BFF}/admin/notifications`).flush(FIRST);
    await stable();
    openBell(root);
    await stable();
    fireEvent.click(ui.getByRole('link', { name: /Comprobante por revisar/ }));
    await stable();
    const read = http.expectOne(`${BFF}/admin/notifications/n1/read`);
    expect(read.request.method).toBe('POST');
    read.flush(null, { status: 204, statusText: 'No Content' });
    await stable();
    expect(bellLabel(root)).toBe('Notificaciones, 4 sin leer');
    expect(root.querySelector('#notifications-panel')).toBeNull();
    expect(TestBed.inject(Router).url).toBe(`/admin/payments/${PAYMENT}`);
  });

  it('does not count a confirmed read twice when the next page already counts it', async () => {
    const { http, root, ui, stable } = await setup();
    http.expectOne(`${BFF}/admin/notifications`).flush(FIRST);
    await stable();
    openBell(root);
    await stable();
    fireEvent.click(ui.getByRole('button', { name: /Aviso de la casa/ }));
    await stable();
    http
      .expectOne(`${BFF}/admin/notifications/n2/read`)
      .flush(null, { status: 204, statusText: 'No Content' });
    await stable();
    expect(bellLabel(root)).toBe('Notificaciones, 4 sin leer');
    fireEvent.click(ui.getByRole('button', { name: 'Mostrar más' }));
    await stable();
    http
      .expectOne(`${BFF}/admin/notifications?after=c2`)
      .flush({ content: [notification({ id: 'n4' })], nextCursor: null, unreadCount: 4 });
    await stable();
    expect(bellLabel(root)).toBe('Notificaciones, 4 sin leer');
  });

  it('puts the mark back and says why when the BFF cannot mark it', async () => {
    const { http, root, ui, stable } = await setup();
    http.expectOne(`${BFF}/admin/notifications`).flush(FIRST);
    await stable();
    openBell(root);
    await stable();
    fireEvent.click(ui.getByRole('button', { name: /Aviso de la casa/ }));
    await stable();
    http.expectOne(`${BFF}/admin/notifications/n2/read`).flush(null, {
      status: 0,
      statusText: 'Unknown Error',
    });
    await stable();
    expect(bellLabel(root)).toBe('Notificaciones, 5 sin leer');
    expect(TestBed.inject(ToastService).current()?.text).toBe(
      'No se pudo conectar con el servidor. Inténtalo de nuevo.',
    );
  });

  it('«Marcar todas como leídas» leaves nothing unread', async () => {
    const { http, root, ui, stable } = await setup();
    http.expectOne(`${BFF}/admin/notifications`).flush(FIRST);
    await stable();
    openBell(root);
    await stable();
    fireEvent.click(ui.getByRole('button', { name: 'Marcar todas como leídas' }));
    await stable();
    http
      .expectOne(`${BFF}/admin/notifications/read-all`)
      .flush(null, { status: 204, statusText: 'No Content' });
    await stable();
    expect(bellLabel(root)).toBe('Notificaciones');
    expect(root.querySelectorAll('.unread')).toHaveLength(0);
    expect(ui.queryByRole('button', { name: 'Marcar todas como leídas' })).toBeNull();
  });

  it('«Mostrar más» asks the next page with its cursor', async () => {
    const { http, root, ui, stable } = await setup();
    http.expectOne(`${BFF}/admin/notifications`).flush(FIRST);
    await stable();
    openBell(root);
    await stable();
    fireEvent.click(ui.getByRole('button', { name: 'Mostrar más' }));
    await stable();
    http
      .expectOne(`${BFF}/admin/notifications?after=c2`)
      .flush({ content: [notification({ id: 'n4' })], nextCursor: null, unreadCount: 5 });
    await stable();
    expect(root.querySelectorAll('.row')).toHaveLength(4);
    expect(ui.queryByRole('button', { name: 'Mostrar más' })).toBeNull();
  });

  it('says it could not read the list and asks again with «Reintentar»', async () => {
    const { http, root, ui, stable } = await setup();
    http
      .expectOne(`${BFF}/admin/notifications`)
      .flush({ code: 'UNEXPECTED_ERROR' }, { status: 500, statusText: 'Server Error' });
    await stable();
    openBell(root);
    await stable();
    expect(ui.getByText('No se pudieron cargar tus notificaciones.')).toBeTruthy();
    fireEvent.click(ui.getByRole('button', { name: 'Reintentar' }));
    await stable();
    http.expectOne(`${BFF}/admin/notifications`).flush({ ...FIRST, content: [], nextCursor: null });
    await stable();
    expect(ui.getByText('No tienes notificaciones.')).toBeTruthy();
  });

  it('reads again when the live key of its inbox, or ALL, arrives', async () => {
    const { http, root, stable } = await setup();
    http.expectOne(`${BFF}/admin/notifications`).flush(FIRST);
    await stable();
    const changes = TestBed.inject(ChangeResourcesService);
    changes.changed(['admin.payments.queue']);
    await stable();
    http.expectNone(`${BFF}/admin/notifications`);
    changes.changed(['admin.notifications']);
    await stable();
    http.expectOne(`${BFF}/admin/notifications`).flush({ ...FIRST, unreadCount: 6 });
    await stable();
    expect(bellLabel(root)).toBe('Notificaciones, 6 sin leer');
    changes.changed('ALL');
    await stable();
    http.expectOne(`${BFF}/admin/notifications`).flush(FIRST);
    await stable();
  });
});
