import { PageLoadState } from './page-load-state';

describe('PageLoadState', () => {
  it('starts a different view without retaining its old error, ready state or pending response', () => {
    const state = new PageLoadState<string>();
    state.succeed(state.begin({ query: 'old', after: null }));
    const old = state.begin({ query: 'old', after: 'cursor' });
    state.reset();
    expect(state.phase()).toBe('loading');
    expect(state.showEmpty()).toBe(false);
    expect(state.succeed(old)).toBe(false);
    const next = state.begin({ query: 'new', after: null });
    state.fail(next);
    expect(state.phase()).toBe('error');
    state.reset();
    expect(state.failed()).toBeNull();
  });
  it('ignores a response after its page has been disposed', () => {
    const state = new PageLoadState<string>();
    const request = state.begin({ query: 'current', after: null });
    state.invalidate();
    expect(state.loading()).toBe(false);
    expect(state.succeed(request)).toBe(false);
    expect(state.fail(request)).toBe(false);
  });
  it('ignores both successes and failures from a query replaced by a newer one', () => {
    const state = new PageLoadState<string>();
    const old = state.begin({ query: 'old', after: null });
    const current = state.begin({ query: 'new', after: null });
    expect(state.succeed(old)).toBe(false);
    expect(state.fail(old)).toBe(false);
    expect(state.loadingFirst()).toBe(true);
    expect(state.pending()?.query).toBe('new');
    expect(state.succeed(current)).toBe(true);
    expect(state.phase()).toBe('ready');
    expect(state.loading()).toBe(false);
    expect(state.fail(current)).toBe(false);
  });

  it('keeps the first-load error visible while explicitly retrying it', () => {
    const state = new PageLoadState<string>();
    const request = { query: 'current', after: null };
    state.fail(state.begin(request));
    expect(state.phase()).toBe('error');
    expect(state.firstFailed()).toBe(true);
    const retry = state.begin(request, true);
    expect(state.retrying()).toBe(true);
    expect(state.phase()).toBe('error');
    state.succeed(retry);
    expect(state.failed()).toBeNull();
    expect(state.showEmpty()).toBe(true);
  });

  it('distinguishes a failed next page from a first page and retains the failed cursor for retry', () => {
    const state = new PageLoadState<string>();
    state.succeed(state.begin({ query: 'current', after: null }));
    const more = state.begin({ query: 'current', after: 'opaque-cursor' });
    expect(state.loadingMore()).toBe(true);
    expect(state.phase()).toBe('ready');
    state.fail(more);
    expect(state.moreFailed()).toBe(true);
    expect(state.failed()?.after).toBe('opaque-cursor');
    const retry = state.begin({ query: 'current', after: 'opaque-cursor' });
    expect(state.failed()).toBeNull();
    state.succeed(retry);
    state.begin({ query: 'another', after: null });
    expect(state.phase()).toBe('ready');
    expect(state.showEmpty()).toBe(false);
    expect(state.loadingFirst()).toBe(true);
  });
});
