import { describe, expect, it } from "vitest";
import { BEATS_PER_BAR, MUSIC_BARS, MUSIC_SECONDS, SECONDS_PER_BEAT } from "../constants";
import { createRandom } from "../random";
import { applyOnePoleLowPass, createPcm, masterToTargetRms, mixNoiseBurst, mixTone, normalizeToPeak } from "../dsp";
import { measureAudio } from "../analysis";

describe("audio DSP", () => {
  it("repeats seeded sequences", () => {
    const first = createRandom(20260819);
    const second = createRandom(20260819);
    expect(Array.from({ length: 8 }, first)).toEqual(Array.from({ length: 8 }, second));
  });

  it("keeps the 18-bar timing invariant exact", () => {
    expect(MUSIC_BARS).toBe(18);
    expect(MUSIC_BARS * BEATS_PER_BAR * SECONDS_PER_BEAT).toBe(MUSIC_SECONDS);
  });

  it("renders bounded stereo tone and normalizes peak", () => {
    const pcm = createPcm(1);
    mixTone(pcm, { start: 0, duration: 0.5, frequency: 440, gain: 0.8, pan: 0 });
    normalizeToPeak(pcm, 10 ** (-1 / 20));
    const metrics = measureAudio(pcm);
    expect(metrics.duration).toBe(1);
    expect(metrics.peak).toBeCloseTo(10 ** (-1 / 20), 5);
    expect(metrics.nonSilentSamples).toBeGreaterThan(10_000);
  });

  it("masters to the requested RMS unless its peak must be limited", () => {
    const targetRms = 10 ** (-21 / 20);
    const steady = createPcm(0.1);
    steady.left.fill(1);
    steady.right.fill(1);
    masterToTargetRms(steady, -21, 10 ** (-1 / 20));
    expect(measureAudio(steady).rms).toBeCloseTo(targetRms, 5);

    const transient = createPcm(4 / 44_100);
    transient.left[0] = 1;
    transient.right[0] = 1;
    masterToTargetRms(transient, -1, 0.5);
    expect(measureAudio(transient).truePeak).toBeLessThanOrEqual(0.500001);
    expect(measureAudio(transient).rms).toBeLessThan(10 ** (-1 / 20));
  });

  it("handles silent and empty PCM safely", () => {
    const pcm = createPcm(0);
    normalizeToPeak(pcm, 0.5);
    masterToTargetRms(pcm, -21, 0.5);
    applyOnePoleLowPass(pcm, 1_000);
    expect(measureAudio(pcm)).toMatchObject({ rms: 0, peak: 0, truePeak: 0, nonSilentSamples: 0 });
  });

  it("mixes partials within the buffer and leaves earlier layers unchanged when filtering noise", () => {
    const pcm = createPcm(1);
    mixTone(pcm, {
      start: 0.1,
      duration: 0.1,
      frequency: 220,
      gain: 0.5,
      pan: -0.25,
      partials: [{ ratio: 1, gain: 1 }, { ratio: 2, gain: 0.25 }],
    });
    const beforeNoise = Array.from(pcm.left.slice(0, 4_410));
    mixNoiseBurst(pcm, { start: 0.5, duration: 0.1, gain: 0.5, pan: 0.25, cutoff: 500 }, createRandom(7));
    mixTone(pcm, { start: 0.95, duration: 0.2, frequency: 440, gain: 0.5, pan: 0 });

    expect(measureAudio(pcm).nonSilentSamples).toBeGreaterThan(10_000);
    expect(Array.from(pcm.left.slice(0, 4_410))).toEqual(beforeNoise);
    expect(Array.from(pcm.left.slice(Math.round(0.99 * pcm.sampleRate))).some((sample) => Math.abs(sample) > 1e-6)).toBe(
      true,
    );
  });
});
