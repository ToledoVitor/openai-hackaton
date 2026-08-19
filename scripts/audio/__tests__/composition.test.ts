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
});
