import { DialogSubmission } from './dialog-submission';

describe('DialogSubmission', () => {
  it('ignores a duplicate submission while retaining the first result and close lock', async () => {
    const dialog = { disableClose: false };
    const submission = new DialogSubmission(dialog);
    let release: (value: string) => void = () => undefined;
    const response = new Promise<string>((resolve) => {
      release = resolve;
    });
    const save = vi.fn(() => response);
    const first = submission.run(save);
    expect(submission.pending()).toBe(true);
    expect(dialog.disableClose).toBe(true);
    await expect(submission.run(save)).resolves.toBeUndefined();
    expect(save).toHaveBeenCalledTimes(1);
    expect(dialog.disableClose).toBe(true);
    release('saved');
    await expect(first).resolves.toBe('saved');
    expect(submission.pending()).toBe(false);
    expect(dialog.disableClose).toBe(false);
  });

  it.each([false, true, undefined])(
    'restores the original close policy (%s) after failure and permits retry',
    async (disableClose) => {
      const dialog = { disableClose };
      const submission = new DialogSubmission(dialog);
      const failure = new Error('save failed');
      await expect(submission.run(() => Promise.reject(failure))).rejects.toBe(failure);
      expect(dialog.disableClose).toBe(disableClose);
      expect(submission.pending()).toBe(false);
      await expect(submission.run(() => Promise.resolve('retried'))).resolves.toBe('retried');
      expect(dialog.disableClose).toBe(disableClose);
    },
  );
});
