import { describe, expect, it, vi } from 'vitest';
import { createLazyVoice } from './lazy-voice';

describe('lazy voice runtime', () => {
  it('does not load or construct Realtime before explicit get', async () => {
    const instance = { isConnected: vi.fn(() => false), connect: vi.fn(), disconnect: vi.fn() };
    const RealtimeVoice = vi.fn(function RealtimeVoiceFake() { return instance; });
    const load = vi.fn(async () => ({ RealtimeVoice }));
    const voice = createLazyVoice(load);

    expect(load).not.toHaveBeenCalled();
    expect(voice.current()).toBeNull();

    await expect(voice.get()).resolves.toBe(instance);
    expect(load).toHaveBeenCalledOnce();
    expect(RealtimeVoice).toHaveBeenCalledOnce();
  });
});
