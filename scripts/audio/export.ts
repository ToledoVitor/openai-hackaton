import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import ogg from "@audio/encode-ogg";
import type { StereoPcm } from "./dsp";
import { encodeWav16 } from "./wav";

export type AudioFormat = "ogg" | "wav";

export type ExportedAudio = {
  bytes: number;
  sha256: string;
};

// @audio/encode-ogg 1.2.2 does not expose the underlying oggSerialNo option and
// otherwise seeds each stream with Math.random(). Serialize initialization and
// supply a fixed value so identical PCM produces byte-identical Ogg streams.
let encoderInitialization = Promise.resolve();

async function createDeterministicEncoder(pcm: StereoPcm) {
  const previousInitialization = encoderInitialization;
  let releaseInitialization!: () => void;
  encoderInitialization = new Promise<void>((resolve) => {
    releaseInitialization = resolve;
  });
  await previousInitialization;

  try {
    const originalRandom = Math.random;
    const fingerprint = createHash("sha256")
      .update(String(pcm.sampleRate))
      .update(new Uint8Array(pcm.left.buffer, pcm.left.byteOffset, pcm.left.byteLength))
      .update(new Uint8Array(pcm.right.buffer, pcm.right.byteOffset, pcm.right.byteLength))
      .digest();
    const serialRandom = (fingerprint.readUInt32LE(0) + 0.5) / 2 ** 32;
    try {
      Math.random = () => serialRandom;
      return await ogg({ sampleRate: pcm.sampleRate, channels: 2, quality: 5 });
    } finally {
      Math.random = originalRandom;
    }
  } finally {
    releaseInitialization();
  }
}

export async function encodeOgg(pcm: StereoPcm): Promise<Uint8Array> {
  const encoder = await createDeterministicEncoder(pcm);
  try {
    const body = encoder.encode([pcm.left, pcm.right]);
    const tail = encoder.flush();
    const output = new Uint8Array(body.length + tail.length);
    output.set(body);
    output.set(tail, body.length);
    return output;
  } finally {
    encoder.free();
  }
}

export async function exportAudio(
  outputRoot: string,
  relativePath: string,
  pcm: StereoPcm,
  format: AudioFormat,
): Promise<ExportedAudio> {
  const bytes = format === "wav" ? encodeWav16(pcm) : await encodeOgg(pcm);
  const outputPath = join(outputRoot, relativePath);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, bytes);
  return { bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
}
