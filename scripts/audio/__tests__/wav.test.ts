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

describe("PCM16 serialization", () => {
  it("clips and interleaves signed samples", () => {
    const pcm = createPcm(2 / 44_100);
    pcm.left.set([-2, 0.5]);
    pcm.right.set([2, -0.5]);
    const view = new DataView(encodeWav16(pcm).buffer);

    expect([view.getInt16(44, true), view.getInt16(46, true), view.getInt16(48, true), view.getInt16(50, true)]).toEqual([
      -32_768,
      32_767,
      16_384,
      -16_384,
    ]);
  });

  it("rejects malformed canonical RIFF sizes and data alignment", () => {
    const bytes = encodeWav16(createPcm(1 / 44_100));
    const incorrectRiffSize = bytes.slice();
    new DataView(incorrectRiffSize.buffer).setUint32(4, 0, true);
    expect(() => readWavHeader(incorrectRiffSize)).toThrow(/RIFF size/i);

    const unalignedData = bytes.slice();
    new DataView(unalignedData.buffer).setUint32(40, 3, true);
    expect(() => readWavHeader(unalignedData)).toThrow(/aligned/i);
  });

  it("rejects non-PCM16 stereo fmt fields", () => {
    const bytes = encodeWav16(createPcm(1 / 44_100));
    const nonPcm = bytes.slice();
    new DataView(nonPcm.buffer).setUint16(20, 3, true);
    expect(() => readWavHeader(nonPcm)).toThrow(/PCM format/i);
  });
});
