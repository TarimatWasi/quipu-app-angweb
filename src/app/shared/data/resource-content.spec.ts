import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { rxResource } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { ResourceContent } from './resource-content';

/** A resource whose every read is a Subject the test answers; `id` is its identity. */
function setup() {
  const id = signal('a');
  const reads: Subject<string>[] = [];
  const content = TestBed.runInInjectionContext(() => {
    const ref = rxResource({
      params: () => id(),
      stream: () => {
        const read = new Subject<string>();
        reads.push(read);
        return read;
      },
    });
    return new ResourceContent(ref, {
      message: (error) => `No se pudo: ${error.message}`,
      identity: id,
    });
  });
  const settle = async () => {
    TestBed.tick();
    await Promise.resolve();
    TestBed.tick();
  };
  const answer = async (value: string) => {
    const read = reads.at(-1);
    read?.next(value);
    read?.complete();
    await settle();
  };
  const fail = async (message: string) => {
    reads.at(-1)?.error(new Error(message));
    await settle();
  };
  return { id, content, settle, answer, fail, reads };
}

describe('ResourceContent (TAR-355)', () => {
  it('goes from the first load to the data', async () => {
    const { content, settle, answer } = setup();
    await settle();
    expect(content.state()).toEqual({ status: 'initial-loading' });

    await answer('uno');

    expect(content.state()).toEqual({ status: 'ready', data: 'uno', refresh: { status: 'idle' } });
    expect(content.data()).toBe('uno');
  });

  it('says a failed first load and keeps saying it while «Reintentar» asks again', async () => {
    const { content, settle, answer, fail } = setup();
    await settle();
    await fail('caído');
    expect(content.state()).toEqual({
      status: 'initial-error',
      message: 'No se pudo: caído',
      retrying: false,
    });

    content.retry();
    await settle();
    expect(content.retrying()).toBe(true);
    expect(content.state()).toMatchObject({
      status: 'initial-error',
      message: 'No se pudo: caído',
    });

    await answer('uno');
    expect(content.data()).toBe('uno');
    expect(content.retrying()).toBe(false);
  });

  it('keeps the data on screen while it refreshes, and when the refresh fails', async () => {
    const { content, settle, answer, fail } = setup();
    await settle();
    await answer('uno');

    content.reload();
    await settle();
    expect(content.refreshing()).toBe(true);
    expect(content.data()).toBe('uno');

    await fail('sin red');
    expect(content.data()).toBe('uno');
    expect(content.refreshError()).toBe('No se pudo: sin red');

    content.reload();
    await settle();
    await answer('dos');
    expect(content.state()).toEqual({ status: 'ready', data: 'dos', refresh: { status: 'idle' } });
  });

  it('starts afresh for another identity: nothing of the previous one is shown', async () => {
    const { id, content, settle, answer, fail } = setup();
    await settle();
    await answer('de a');
    content.reload();
    await settle();
    await fail('sin red');
    expect(content.refreshError()).not.toBeNull();

    id.set('b');
    await settle();
    expect(content.state()).toEqual({ status: 'initial-loading' });
    expect(content.data()).toBeNull();
    expect(content.error()).toBeUndefined();

    await answer('de b');
    expect(content.data()).toBe('de b');
  });

  it('any read after a failed first load keeps the error, saying it is asking again', async () => {
    const { content, settle, answer, fail } = setup();
    await settle();
    await fail('caído');

    content.reload();
    await settle();

    expect(content.state()).toEqual({
      status: 'initial-error',
      message: 'No se pudo: caído',
      retrying: true,
    });
    await answer('uno');
    expect(content.data()).toBe('uno');
  });

  it('forgets what it kept of an identity once another one is read, also on coming back', async () => {
    const { id, content, settle, answer, fail } = setup();
    await settle();
    await answer('a viejo');
    content.reload();
    await settle();
    await answer('a refrescado');

    id.set('b');
    await settle();
    await answer('de b');
    id.set('a');
    await settle();
    expect(content.state()).toEqual({ status: 'initial-loading' });

    await fail('caído');
    expect(content.data()).toBeNull();
    expect(content.state()).toMatchObject({ status: 'initial-error', retrying: false });
  });

  it('says a record that is gone (404) as a page, and any other failed refresh as a problem', async () => {
    const { content, settle, answer, reads } = setup();
    await settle();
    expect(content.page()).toEqual({ kind: 'loading' });
    await answer('uno');
    expect(content.page()).toEqual({ kind: 'ready' });

    content.reload();
    await settle();
    reads.at(-1)?.error(new HttpErrorResponse({ status: 500, statusText: 'x' }));
    await settle();
    expect(content.page()).toEqual({ kind: 'ready' });
    expect(content.refreshProblem()).toMatch(/^No se pudo: /);

    content.reload();
    await settle();
    reads.at(-1)?.error(new HttpErrorResponse({ status: 404, statusText: 'x' }));
    await settle();
    expect(content.notFound()).toBe(true);
    expect(content.refreshProblem()).toBeNull();
    expect(content.page()).toMatchObject({ kind: 'not-found' });
  });

  it('does not depend on being read: a refresh that fails keeps data nobody looked at', async () => {
    const { content, settle, answer, fail } = setup();
    await settle();
    await answer('uno');
    // Nothing reads the state until the refresh has already failed.
    content.reload();
    await settle();
    await fail('sin red');

    expect(content.data()).toBe('uno');
    expect(content.refreshError()).toBe('No se pudo: sin red');
  });
});
