import { AsyncContentState } from './async-content';

function request<T>(state: AsyncContentState<T>, newContext = false): number {
  const id = state.begin(newContext);
  if (id === null) throw new Error('expected a new request');
  return id;
}

describe('AsyncContentState', () => {
  it('retains the first error on retry and rejects concurrent retries', () => {
    const content = new AsyncContentState<string[]>();
    content.fail(request(content), 'Unavailable');
    const retry = request(content);
    expect(content.state()).toEqual({
      status: 'initial-error',
      message: 'Unavailable',
      retrying: true,
    });
    expect(content.begin()).toBeNull();
    content.succeed(retry, []);
    expect(content.state()).toEqual({ status: 'ready', data: [], refresh: { status: 'idle' } });
  });

  it('keeps usable data during refresh, failure and recovery', () => {
    const content = new AsyncContentState<string>();
    content.succeed(request(content), 'original');
    const refresh = request(content);
    expect(content.state()).toEqual({
      status: 'ready',
      data: 'original',
      refresh: { status: 'loading' },
    });
    content.fail(refresh, 'Try again');
    expect(content.data()).toBe('original');
    expect(content.state()).toEqual({
      status: 'ready',
      data: 'original',
      refresh: { status: 'error', message: 'Try again' },
    });
    content.succeed(request(content), 'updated');
    expect(content.data()).toBe('updated');
  });

  it('clears data for a new identity and ignores old answers and duplicate completions', () => {
    const content = new AsyncContentState<string>();
    content.succeed(request(content), 'first entity');
    const old = request(content);
    const next = request(content, true);
    expect(content.data()).toBeNull();
    expect(content.state().status).toBe('initial-loading');
    expect(content.succeed(old, 'stale')).toBe(false);
    expect(content.fail(old, 'stale error')).toBe(false);
    expect(content.succeed(next, 'new entity')).toBe(true);
    expect(content.fail(next, 'duplicate')).toBe(false);
    expect(content.data()).toBe('new entity');
  });

  it('invalidates pending work and prevents requests after disposal', () => {
    const content = new AsyncContentState<string>();
    const pending = request(content);
    content.dispose();
    expect(content.succeed(pending, 'late')).toBe(false);
    expect(content.fail(pending, 'late error')).toBe(false);
    expect(content.begin(true)).toBeNull();
  });
});
