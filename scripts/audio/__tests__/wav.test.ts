import { describe, expect, it } from "vitest";
import { createPcm } from "../dsp";
import { encodeWav16, readWavHeader } from "../wav";

it("writes canonical 16-bit stereo WAV", () => {
  const bytes = encodeWav16(createPcm(2));
  expect(readWavHeader(bytes)).toEqual({
    channels: 2,
    sampleRate: 44_100,
    bitsPerSample: 16,
    frames: 88_200,
    duration: 2,
  });
});
