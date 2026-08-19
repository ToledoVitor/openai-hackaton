import type { StereoPcm } from "./dsp";

const WAV_HEADER_BYTES = 44;
const PCM_FORMAT = 1;
const CHANNELS = 2;
const BITS_PER_SAMPLE = 16;

export type WavHeader = {
  channels: number;
  sampleRate: number;
  bitsPerSample: number;
  frames: number;
  duration: number;
};

export function encodeWav16(pcm: StereoPcm): Uint8Array {
  const frames = Math.min(pcm.left.length, pcm.right.length);
  const blockAlign = CHANNELS * (BITS_PER_SAMPLE / 8);
  const dataBytes = frames * blockAlign;
  const bytes = new Uint8Array(WAV_HEADER_BYTES + dataBytes);
  const view = new DataView(bytes.buffer);

  writeAscii(bytes, 0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(bytes, 8, "WAVE");
  writeAscii(bytes, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, PCM_FORMAT, true);
  view.setUint16(22, CHANNELS, true);
  view.setUint32(24, pcm.sampleRate, true);
  view.setUint32(28, pcm.sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, BITS_PER_SAMPLE, true);
  writeAscii(bytes, 36, "data");
  view.setUint32(40, dataBytes, true);

  for (let frame = 0; frame < frames; frame += 1) {
    const offset = WAV_HEADER_BYTES + frame * blockAlign;
    view.setInt16(offset, floatToInt16(pcm.left[frame]), true);
    view.setInt16(offset + 2, floatToInt16(pcm.right[frame]), true);
  }
  return bytes;
}

export function readWavHeader(bytes: Uint8Array): WavHeader {
  if (bytes.length < WAV_HEADER_BYTES) throw new Error("WAV data is shorter than a canonical header");
  if (readAscii(bytes, 0, 4) !== "RIFF") throw new Error("WAV is missing RIFF marker");
  if (readAscii(bytes, 8, 4) !== "WAVE") throw new Error("WAV is missing WAVE marker");
  if (readAscii(bytes, 12, 4) !== "fmt ") throw new Error("WAV is missing fmt marker");
  if (readAscii(bytes, 36, 4) !== "data") throw new Error("WAV is missing data marker");

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const riffSize = view.getUint32(4, true);
  const formatSize = view.getUint32(16, true);
  const format = view.getUint16(20, true);
  const channels = view.getUint16(22, true);
  const sampleRate = view.getUint32(24, true);
  const byteRate = view.getUint32(28, true);
  const bitsPerSample = view.getUint16(34, true);
  const blockAlign = view.getUint16(32, true);
  const dataBytes = view.getUint32(40, true);
  const expectedBlockAlign = CHANNELS * (BITS_PER_SAMPLE / 8);

  if (riffSize !== bytes.length - 8) throw new Error("WAV RIFF size does not match file length");
  if (formatSize !== 16) throw new Error("WAV fmt chunk must be canonical 16-byte PCM");
  if (format !== PCM_FORMAT) throw new Error("WAV must use PCM format");
  if (channels !== CHANNELS) throw new Error("WAV must be stereo");
  if (bitsPerSample !== BITS_PER_SAMPLE) throw new Error("WAV must use 16-bit samples");
  if (blockAlign !== expectedBlockAlign) throw new Error("WAV block alignment is invalid");
  if (byteRate !== sampleRate * blockAlign) throw new Error("WAV byte rate is invalid");
  if (dataBytes % blockAlign !== 0) throw new Error("WAV data size must be block-aligned");
  if (dataBytes !== bytes.length - WAV_HEADER_BYTES) throw new Error("WAV data size does not match file length");

  const frames = dataBytes / blockAlign;
  return { channels, sampleRate, bitsPerSample, frames, duration: frames / sampleRate };
}

function floatToInt16(sample: number): number {
  const clipped = Math.max(-1, Math.min(1, sample));
  return clipped < 0 ? Math.round(clipped * 32_768) : Math.round(clipped * 32_767);
}

function writeAscii(bytes: Uint8Array, offset: number, value: string): void {
  for (let index = 0; index < value.length; index += 1) bytes[offset + index] = value.charCodeAt(index);
}

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}
