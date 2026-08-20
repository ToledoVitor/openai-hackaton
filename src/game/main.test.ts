import { describe, expect, it, vi } from 'vitest';
import { bootstrapGame, renderLoadFailure, type GameRuntime } from './main';
import type { PlayerProfile } from './entrada';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
}

describe('game bootstrap', () => {
  it('does not load runtime before entry resolves', async () => {
    const entry = deferred<PlayerProfile>();
    const loadRuntime = vi.fn(async (): Promise<GameRuntime> => ({ start: vi.fn(async () => undefined) }));

    const boot = bootstrapGame({ showEntry: () => entry.promise, loadRuntime });
    await Promise.resolve();

    expect(loadRuntime).not.toHaveBeenCalled();

    entry.resolve({ name: 'Maya', language: 'english' });
    await boot;
    expect(loadRuntime).toHaveBeenCalledOnce();
  });

  it('starts loaded runtime with exact submitted profile', async () => {
    const profile: PlayerProfile = { name: 'Lia Toledo', language: 'portuguese' };
    const start = vi.fn(async () => undefined);

    await bootstrapGame({
      showEntry: async () => profile,
      loadRuntime: async () => ({ start }),
    });

    expect(start).toHaveBeenCalledOnce();
    expect(start).toHaveBeenCalledWith(profile);
  });

  it('renders a localized static failure with an explicit retry action', () => {
    const addClass = vi.fn();
    const reload = vi.fn();
    const showRetry = vi.fn();
    const view = {
      loading: { classList: { add: addClass } },
      loadingText: { textContent: '' },
      showRetry,
    };

    renderLoadFailure('english', view, reload);

    expect(view.loadingText.textContent).toBe('The city could not load. Reload to try again.');
    expect(showRetry).toHaveBeenCalledWith('Try again', reload);
    expect(addClass).toHaveBeenCalledWith('erro');
    showRetry.mock.calls[0][1]();
    expect(reload).toHaveBeenCalledOnce();
  });
});
