import { describe, expect, it, vi } from 'vitest';
import { bootstrapGame, type GameRuntime } from './main';
import type { PlayerProfile } from './entrada';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
}

describe('game bootstrap', () => {
  it('does not load runtime before entry resolves', async () => {
    const entry = deferred<PlayerProfile>();
    const loadRuntime = vi.fn(async (): Promise<GameRuntime> => ({ start: vi.fn() }));

    const boot = bootstrapGame({ showEntry: () => entry.promise, loadRuntime });
    await Promise.resolve();

    expect(loadRuntime).not.toHaveBeenCalled();

    entry.resolve({ name: 'Maya', language: 'english' });
    await boot;
    expect(loadRuntime).toHaveBeenCalledOnce();
  });

  it('starts loaded runtime with exact submitted profile', async () => {
    const profile: PlayerProfile = { name: 'Lia Toledo', language: 'portuguese' };
    const start = vi.fn();

    await bootstrapGame({
      showEntry: async () => profile,
      loadRuntime: async () => ({ start }),
    });

    expect(start).toHaveBeenCalledOnce();
    expect(start).toHaveBeenCalledWith(profile);
  });
});
