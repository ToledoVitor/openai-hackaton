import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAudioManager } from "../audioManager";

class FakeAudio {
  loop = false;
  muted = false;
  volume = 1;
  currentTime = 0;
  onended: ((event: Event) => void) | null = null;
  play = vi.fn(async () => undefined);
  pause = vi.fn();

  constructor(readonly src: string) {}
}

describe("audio manager", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("loops music at a soft default volume", () => {
    const audio: FakeAudio[] = [];
    const manager = createAudioManager({
      createAudio: (src) => {
        const instance = new FakeAudio(src);
        audio.push(instance);
        return instance;
      },
    });

    manager.start();
    expect(audio[0].src).toBe("/audio/music/cozy-city-loop.ogg");
    expect(audio[0].loop).toBe(true);
    expect(audio[0].volume).toBe(0.18);
    expect(audio[0].play).toHaveBeenCalledOnce();
  });

  it.each([
    [0, 10_999, 11_000],
    [0.999_999, 29_999, 30_000],
  ])("schedules city sounds between 11 and 30 seconds (random %s)", async (random, beforeDelay, delay) => {
    const audio: FakeAudio[] = [];
    const manager = createAudioManager({
      createAudio: (src) => {
        const instance = new FakeAudio(src);
        audio.push(instance);
        return instance;
      },
      random: () => random,
    });

    manager.start();
    await vi.advanceTimersByTimeAsync(beforeDelay);
    expect(audio).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(delay - beforeDelay);
    expect(audio).toHaveLength(2);
    expect(audio[1].play).toHaveBeenCalledOnce();
  });

  it("measures each city-sound interval from the previous sound start", async () => {
    const audio: FakeAudio[] = [];
    const manager = createAudioManager({
      createAudio: (src) => {
        const instance = new FakeAudio(src);
        audio.push(instance);
        return instance;
      },
      random: () => 0,
    });

    manager.start();
    await vi.advanceTimersByTimeAsync(22_000);
    expect(audio).toHaveLength(3);
    expect(audio[2].play).toHaveBeenCalledOnce();
  });

  it("applies mute, voice ducking, and persisted preferences", () => {
    const audio: FakeAudio[] = [];
    const storage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
    };
    const manager = createAudioManager({
      createAudio: (src) => {
        const instance = new FakeAudio(src);
        audio.push(instance);
        return instance;
      },
      storage,
    });

    manager.setMusicVolume(0.5);
    manager.beginVoice();
    expect(audio[0].volume).toBeCloseTo(0.5 * 10 ** (-8 / 20));
    manager.endVoice();
    expect(audio[0].volume).toBeCloseTo(0.5);
    manager.setMuted(true);
    expect(audio[0].muted).toBe(true);
    expect(storage.setItem).toHaveBeenLastCalledWith(
      "ai-city-mayor.audio.v2",
      JSON.stringify({ muted: true, musicVolume: 0.5, ambienceVolume: 0.25 }),
    );
  });

  it("cancels pending ambience when stopped", async () => {
    const audio: FakeAudio[] = [];
    const manager = createAudioManager({
      createAudio: (src) => {
        const instance = new FakeAudio(src);
        audio.push(instance);
        return instance;
      },
      random: () => 0,
    });

    manager.start();
    manager.stop();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(audio).toHaveLength(1);
    expect(audio[0].pause).toHaveBeenCalledOnce();
  });
});
