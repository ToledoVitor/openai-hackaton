import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { GENERATION_SEED, MUSIC_SECONDS, SAMPLE_RATE } from "./constants";
import type { AudioManifest, AudioManifestAsset } from "./generate-audio";
import { readWavHeader } from "./wav";

const EXPECTED_ASSETS = [
  "music/cozy-city-loop.ogg",
  "music/cozy-city-loop.wav",
  "sfx/bicycle-bell.ogg",
  "sfx/birds.ogg",
  "sfx/crosswalk-chirp.ogg",
  "sfx/distant-bus.ogg",
  "sfx/footsteps.ogg",
] as const;

const EXPECTED_DURATIONS: Record<(typeof EXPECTED_ASSETS)[number], number> = {
  "music/cozy-city-loop.ogg": 48,
  "music/cozy-city-loop.wav": 48,
  "sfx/bicycle-bell.ogg": 1.6,
  "sfx/birds.ogg": 2.4,
  "sfx/crosswalk-chirp.ogg": 1.8,
  "sfx/distant-bus.ogg": 4.8,
  "sfx/footsteps.ogg": 2.8,
};

function fail(message: string): never {
  throw new Error(`Audio verification failed: ${message}`);
}

function isAsset(value: unknown): value is AudioManifestAsset {
  if (!value || typeof value !== "object") return false;
  const asset = value as Record<string, unknown>;
  return (
    typeof asset.path === "string" &&
    /^[a-f0-9]{64}$/.test(String(asset.sha256)) &&
    Number.isInteger(asset.bytes) &&
    Number(asset.bytes) > 0 &&
    typeof asset.duration === "number" &&
    Number.isFinite(asset.duration) &&
    asset.duration > 0 &&
    asset.sampleRate === SAMPLE_RATE &&
    asset.channels === 2 &&
    asset.seed === GENERATION_SEED &&
    asset.license === "CC0-1.0"
  );
}

function parseManifest(source: string): AudioManifest {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    return fail("manifest.json is not valid JSON");
  }
  if (!value || typeof value !== "object") return fail("manifest.json must contain an object");
  const manifest = value as Partial<AudioManifest>;
  if (manifest.generator !== "scripts/audio/generate-audio.ts") return fail("manifest generator is invalid");
  if (manifest.command !== "npm run audio:generate") return fail("manifest command is invalid");
  if (manifest.seed !== GENERATION_SEED) return fail(`manifest seed must be ${GENERATION_SEED}`);
  if (!Array.isArray(manifest.assets) || !manifest.assets.every(isAsset)) return fail("manifest assets are malformed");
  return manifest as AudioManifest;
}

async function listFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  async function visit(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) files.push(relative(root, path).split(sep).join("/"));
      else fail(`unsupported filesystem entry ${relative(root, path)}`);
    }
  }
  for (const directory of ["music", "sfx"]) {
    try {
      await visit(join(root, directory));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") fail(`missing ${directory}/ directory`);
      throw error;
    }
  }
  return files.sort();
}

async function verifyAsset(outputRoot: string, asset: AudioManifestAsset): Promise<void> {
  const expectedDuration = EXPECTED_DURATIONS[asset.path as keyof typeof EXPECTED_DURATIONS];
  if (asset.duration !== expectedDuration) fail(`manifest duration is invalid for ${asset.path}`);
  let bytes: Uint8Array;
  try {
    bytes = await readFile(join(outputRoot, asset.path));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") fail(`missing asset ${asset.path}`);
    throw error;
  }
  if (bytes.length !== asset.bytes) fail(`byte count mismatch for ${asset.path}`);
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (hash !== asset.sha256) fail(`SHA-256 mismatch for ${asset.path}`);

  if (asset.path.endsWith(".wav")) {
    let header;
    try {
      header = readWavHeader(bytes);
    } catch (error) {
      fail(`${asset.path} is malformed: ${(error as Error).message}`);
    }
    if (header.sampleRate !== SAMPLE_RATE) fail(`music WAV sample rate must be ${SAMPLE_RATE} Hz`);
    if (header.duration !== MUSIC_SECONDS) fail(`music WAV duration must be ${MUSIC_SECONDS} seconds`);
    if (asset.duration !== MUSIC_SECONDS) fail(`manifest music duration must be ${MUSIC_SECONDS} seconds`);
  } else {
    verifyOggIdentificationPage(asset.path, bytes);
  }
}

function verifyOggIdentificationPage(path: string, bytes: Uint8Array): void {
  if (bytes.length < 64 || String.fromCharCode(...bytes.subarray(0, 4)) !== "OggS" || bytes[4] !== 0) {
    fail(`${path} is a malformed Ogg stream`);
  }
  const segmentCount = bytes[26];
  const payloadStart = 27 + segmentCount;
  if (payloadStart + 7 > bytes.length) fail(`${path} is a malformed Ogg stream`);
  let payloadBytes = 0;
  for (let segment = 0; segment < segmentCount; segment += 1) payloadBytes += bytes[27 + segment];
  if (payloadStart + payloadBytes > bytes.length) fail(`${path} is a malformed Ogg stream`);
  const identification = bytes.subarray(payloadStart, payloadStart + 7);
  if (identification[0] !== 1 || String.fromCharCode(...identification.subarray(1)) !== "vorbis") {
    fail(`${path} is a malformed Ogg stream`);
  }
}

export async function verifyAudio(outputRoot: string): Promise<void> {
  let manifestSource: string;
  let license: string;
  let readme: string;
  try {
    [manifestSource, license, readme] = await Promise.all([
      readFile(join(outputRoot, "manifest.json"), "utf8"),
      readFile(join(outputRoot, "LICENSE"), "utf8"),
      readFile(join(outputRoot, "README.md"), "utf8"),
    ]);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") fail("manifest.json, LICENSE, or README.md is missing");
    throw error;
  }
  if (!license.includes("CC0 1.0") || !license.includes("creativecommons.org/publicdomain/zero/1.0/legalcode")) {
    fail("LICENSE does not declare CC0 1.0 and its legal code");
  }
  for (const statement of [
    "npm run audio:generate",
    "npm run audio:verify",
    String(GENERATION_SEED),
    "external samples",
    "Animal Crossing",
    "@audio/encode-ogg@1.2.2",
  ]) {
    if (!readme.includes(statement)) fail(`README.md is missing provenance statement: ${statement}`);
  }

  const manifest = parseManifest(manifestSource);
  const manifestPaths = manifest.assets.map((asset) => asset.path);
  if (JSON.stringify(manifestPaths) !== JSON.stringify([...EXPECTED_ASSETS])) {
    fail("manifest must contain exactly seven expected assets sorted by path");
  }
  const files = await listFiles(outputRoot);
  if (JSON.stringify(files) !== JSON.stringify([...EXPECTED_ASSETS])) {
    fail("music/ and sfx/ contain missing or unexpected files");
  }
  await Promise.all(manifest.assets.map((asset) => verifyAsset(outputRoot, asset)));
}

const commandPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === commandPath) {
  verifyAudio(resolve(process.cwd(), "public/audio")).then(
    () => console.log("Verified 7 audio assets in public/audio."),
    (error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    },
  );
}
