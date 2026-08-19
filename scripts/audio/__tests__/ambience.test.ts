import { expect, it } from "vitest";
import { measureAudio } from "../analysis";
import { renderAmbienceAssets } from "../ambience";

it("renders five distinct bounded ambience assets", () => {
  const assets = renderAmbienceAssets();
  expect(Object.keys(assets).sort()).toEqual([
    "bicycle-bell",
    "birds",
    "crosswalk-chirp",
    "distant-bus",
    "footsteps",
  ]);
  for (const pcm of Object.values(assets)) {
    const metrics = measureAudio(pcm);
    expect(metrics.duration).toBeGreaterThan(0.4);
    expect(metrics.duration).toBeLessThanOrEqual(5);
    expect(metrics.peak).toBeLessThanOrEqual(10 ** (-1 / 20) + 1e-6);
    expect(metrics.nonSilentSamples).toBeGreaterThan(1_000);
  }
});
