import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { renderAmbienceAssets, type AmbienceName } from "./ambience";
import { renderCozyCityLoop } from "./composition";
import { GENERATION_SEED } from "./constants";
import { exportAudio } from "./export";
import type { StereoPcm } from "./dsp";

export type AudioManifestAsset = {
  path: string;
  sha256: string;
  bytes: number;
  duration: number;
  sampleRate: number;
  channels: 2;
  seed: number;
  license: "CC0-1.0";
};

export type AudioManifest = {
  generator: "scripts/audio/generate-audio.ts";
  command: "npm run audio:generate";
  seed: number;
  assets: AudioManifestAsset[];
};

const LICENSE_TEXT = `CC0 1.0 Universal (CC0 1.0) Public Domain Dedication

The copyright holder waives, to the fullest extent permitted by law, all
copyright and related or neighboring rights in these original generated audio
exports:

- music/cozy-city-loop.wav
- music/cozy-city-loop.ogg
- sfx/bicycle-bell.ogg
- sfx/birds.ogg
- sfx/crosswalk-chirp.ogg
- sfx/distant-bus.ogg
- sfx/footsteps.ogg

Legal code: https://creativecommons.org/publicdomain/zero/1.0/legalcode
`;

function duration(pcm: StereoPcm): number {
  return pcm.left.length / pcm.sampleRate;
}

function defaultReadme(manifest: AudioManifest): string {
  const rows = manifest.assets
    .map((asset) => `| \`${asset.path}\` | ${asset.duration.toFixed(1)} s | ${asset.bytes} | \`${asset.sha256}\` |`)
    .join("\n");
  return `# Cozy City generated audio

Original composition and effects synthesized without downloads, recordings, or
external samples. Generate with \`npm run audio:generate\` and verify with
\`npm run audio:verify\`. The deterministic seed is \`${manifest.seed}\`.

Animal Crossing is only a boundary reference for broad cozy daily-life warmth.
No melody, harmony sequence, arrangement, sound effect, recording, or sample
from it or any other work was copied or closely imitated.

The development-only Ogg encoder is \`@audio/encode-ogg@1.2.2\` (MIT). Runtime
deployment ships these media files, not the encoder or its WASM toolchain.
Generator code is MIT licensed by the repository root license. Generated media
is released under CC0 1.0; see \`LICENSE\`.

| Asset | Duration | Bytes | SHA-256 |
|---|---:|---:|---|
${rows}
`;
}

async function writeIfMissing(path: string, contents: string): Promise<void> {
  try {
    await writeFile(path, contents, { flag: "wx" });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
}

async function addAsset(
  outputRoot: string,
  path: string,
  pcm: StereoPcm,
  format: "ogg" | "wav",
  seed: number,
): Promise<AudioManifestAsset> {
  const exported = await exportAudio(outputRoot, path, pcm, format);
  return {
    path,
    sha256: exported.sha256,
    bytes: exported.bytes,
    duration: duration(pcm),
    sampleRate: pcm.sampleRate,
    channels: 2,
    seed,
    license: "CC0-1.0",
  };
}

export async function generateAudio(outputRoot: string): Promise<AudioManifest> {
  const seed = GENERATION_SEED;
  await mkdir(outputRoot, { recursive: true });
  const music = renderCozyCityLoop(seed);
  const ambience = renderAmbienceAssets(seed);
  const assets: AudioManifestAsset[] = [];

  assets.push(await addAsset(outputRoot, "music/cozy-city-loop.wav", music, "wav", seed));
  assets.push(await addAsset(outputRoot, "music/cozy-city-loop.ogg", music, "ogg", seed));
  for (const name of Object.keys(ambience).sort() as AmbienceName[]) {
    assets.push(await addAsset(outputRoot, `sfx/${name}.ogg`, ambience[name], "ogg", seed));
  }
  assets.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

  const manifest: AudioManifest = {
    generator: "scripts/audio/generate-audio.ts",
    command: "npm run audio:generate",
    seed,
    assets,
  };
  await writeFile(join(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  await writeIfMissing(join(outputRoot, "LICENSE"), LICENSE_TEXT);
  await writeIfMissing(join(outputRoot, "README.md"), defaultReadme(manifest));
  return manifest;
}

const commandPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === commandPath) {
  generateAudio(resolve(process.cwd(), "public/audio")).then(
    (manifest) => console.log(`Generated ${manifest.assets.length} audio assets in public/audio.`),
    (error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    },
  );
}
