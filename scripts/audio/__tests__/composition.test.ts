import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { measureAudio } from "../analysis";
import { renderCozyCityLoop } from "../composition";

function pcmHash(pcm: ReturnType<typeof renderCozyCityLoop>): string {
  return createHash("sha256")
    .update(Buffer.from(pcm.left.buffer))
    .update(Buffer.from(pcm.right.buffer))
    .digest("hex");
}

function rmsBetween(pcm: ReturnType<typeof renderCozyCityLoop>, start: number, end: number): number {
  let squareSum = 0;
  for (let frame = start; frame < end; frame += 1) {
    squareSum += pcm.left[frame] ** 2 + pcm.right[frame] ** 2;
  }
  return Math.sqrt(squareSum / ((end - start) * 2));
}

function contiguousBoundarySilence(pcm: ReturnType<typeof renderCozyCityLoop>, threshold = 1e-5): number {
  const isSilent = (frame: number) =>
    Math.max(Math.abs(pcm.left[frame]), Math.abs(pcm.right[frame])) < threshold;
  let leadingFrames = 0;
  let trailingFrames = 0;
  while (leadingFrames < pcm.left.length && isSilent(leadingFrames)) leadingFrames += 1;
  while (trailingFrames < pcm.left.length && isSilent(pcm.left.length - 1 - trailingFrames)) trailingFrames += 1;
  return (leadingFrames + trailingFrames) / pcm.sampleRate;
}

describe("cozy city composition", () => {
  it("renders deterministic 48-second loop under peak ceiling", () => {
    const first = renderCozyCityLoop();
    const second = renderCozyCityLoop();
    const metrics = measureAudio(first);
    expect(metrics.duration).toBe(48);
    expect(metrics.peak).toBeLessThanOrEqual(10 ** (-1 / 20) + 1e-6);
    expect(metrics.truePeak).toBeLessThanOrEqual(10 ** (-1 / 20) + 1e-6);
    expect(20 * Math.log10(metrics.rms)).toBeGreaterThanOrEqual(-24);
    expect(20 * Math.log10(metrics.rms)).toBeLessThanOrEqual(-18);
    expect(metrics.boundaryJump).toBeLessThan(0.01);
    expect(pcmHash(first)).toBe(pcmHash(second));
  });

  it("keeps audible waveform continuity across the repeated boundary", () => {
    const pcm = renderCozyCityLoop();
    const edgeFrames = Math.round(0.04 * pcm.sampleRate);
    const lastFrame = pcm.left.length - 1;
    const slopeDiscontinuity = Math.max(
      Math.abs(pcm.left[1] - pcm.left[0] - (pcm.left[lastFrame] - pcm.left[lastFrame - 1])),
      Math.abs(pcm.right[1] - pcm.right[0] - (pcm.right[lastFrame] - pcm.right[lastFrame - 1])),
    );

    expect(contiguousBoundarySilence(pcm)).toBeLessThan(0.005);
    expect(rmsBetween(pcm, 0, edgeFrames)).toBeGreaterThan(0.001);
    expect(rmsBetween(pcm, pcm.left.length - edgeFrames, pcm.left.length)).toBeGreaterThan(0.001);
    expect(slopeDiscontinuity).toBeLessThan(0.001);
  });
});
