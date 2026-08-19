import { describe, expect, it } from "vitest";
import { createRandom } from "../random";
import { createPcm, mixTone, normalizeToPeak } from "../dsp";
import { measureAudio } from "../analysis";

describe("audio DSP", () => {
  it("repeats seeded sequences", () => {
    const first = createRandom(20260819);
    const second = createRandom(20260819);
    expect(Array.from({ length: 8 }, first)).toEqual(Array.from({ length: 8 }, second));
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
});
