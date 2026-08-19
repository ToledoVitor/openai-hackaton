# Cozy City Audio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one original 48-second cozy urban music loop, five synthesized ambience assets, and a tested browser playback system with sparse scheduling, controls, persistence, and voice ducking.

**Architecture:** Deterministic TypeScript renderers generate stereo PCM from oscillators and seeded noise, then write WAV and Ogg Vorbis assets. Framework-neutral browser modules own preferences, ambience scheduling, and Web Audio nodes; small React controls and a Vite preview prove integration without prematurely building the full game shell.

**Tech Stack:** Node.js 22+, TypeScript, Vitest, Web Audio API, React, Vite preview harness, `@audio/encode-ogg@1.2.2` for MIT-licensed Ogg encoding

**Spec:** `docs/superpowers/specs/2026-08-19-cozy-city-audio-design.md`

## Global Constraints

- Music duration is exactly 48 seconds: 18 bars, 90 BPM, 4/4.
- Music and every ambience effect are generated from oscillators, envelopes, filters, and deterministic noise; no external samples or copied melodies enter repository.
- Animal Crossing remains broad thematic reference only; no recognizable melody, arrangement, recording, sound effect, or asset imitation.
- Generated WAV and Ogg assets use CC0 1.0; repository code uses MIT.
- Runtime music defaults to 35%, ambience to 25%, generated voice to 100%.
- Music targets approximately -18 LUFS and never exceeds -1 dBFS estimated true peak.
- Ambience interval stays between 8 and 22 seconds; same effect never repeats immediately; only one ambience effect plays at once.
- Voice lowers music by about 8 dB and ambience by about 10 dB, then restores previous levels.
- Audio failure never blocks Prompt Quest or repair animation.
- Persist mute and volume preferences only; never persist decoded audio, generated speech, microphone audio, or playback history.
- Runtime uses checked-in assets and never ships encoder WASM to browser.

## File Map

```text
LICENSE                                  MIT license for repository code
THIRD_PARTY_NOTICES.md                   Encoder and test-tool license inventory
package.json                             Audio scripts, dependencies, test commands
package-lock.json                        Reproducible dependency resolution
tsconfig.json                            Node + DOM TypeScript settings
vitest.config.ts                         Node and jsdom test projects
scripts/audio/constants.ts               Sample rate, duration, tempo, mastering constants
scripts/audio/random.ts                  Deterministic Mulberry32 random source
scripts/audio/dsp.ts                     Oscillators, envelopes, noise, filters, mixing
scripts/audio/analysis.ts                Peak, RMS, boundary, duration checks
scripts/audio/wav.ts                     16-bit stereo WAV encoder and header reader
scripts/audio/composition.ts             Original 18-bar music arrangement
scripts/audio/ambience.ts                Five original city-effect renderers
scripts/audio/export.ts                  WAV/Ogg writing and checksum manifest
scripts/audio/generate-audio.ts          Generation entry point
scripts/audio/verify-audio.ts            Asset/provenance verification entry point
scripts/audio/__tests__/*.test.ts        Generator unit and integration tests
public/audio/LICENSE                     CC0 1.0 declaration for generated audio
public/audio/README.md                   Provenance, seed, commands, asset manifest
public/audio/manifest.json               Machine-readable durations and SHA-256 hashes
public/audio/music/*                     WAV master and Ogg runtime loop
public/audio/sfx/*                       Five Ogg runtime ambience effects
src/audio/types.ts                       Public runtime contracts
src/audio/preferences.ts                 Defaults, validation, localStorage adapter
src/audio/ambienceScheduler.ts           Pure weighted selection and timer lifecycle
src/audio/webAudioDirector.ts            Buffer loading, looping, gains, ducking, cleanup
src/audio/AudioProvider.tsx              React lifecycle and first-interaction unlock
src/audio/AudioControls.tsx              Mute plus music/ambience sliders
src/audio/index.ts                       Stable public exports
src/audio/__tests__/*.test.ts            Runtime and React behavior tests
audio-preview/index.html                 Local listening harness
audio-preview/main.tsx                   Mounts provider and controls for audition
```

---

### Task 1: Licensed TypeScript Audio Workspace

**Files:**
- Create: `LICENSE`
- Create: `THIRD_PARTY_NOTICES.md`
- Create: `package.json`
- Create: `package-lock.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/audio/__tests__/toolchain.test.ts`

**Interfaces:**
- Consumes: Node.js `>=22.0.0`
- Produces: `npm run test`, `npm run typecheck`, `npm run audio:generate`, `npm run audio:verify`, and `npm run audio:preview`

- [ ] **Step 1: Write toolchain smoke test**

```ts
// src/audio/__tests__/toolchain.test.ts
import { describe, expect, it } from "vitest";

describe("audio toolchain", () => {
  it("runs TypeScript tests on supported Node", () => {
    expect(Number(process.versions.node.split(".")[0])).toBeGreaterThanOrEqual(22);
  });
});
```

- [ ] **Step 2: Create package and compiler configuration**

```json
{
  "name": "ai-city-mayor",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22.0.0" },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "audio:generate": "tsx scripts/audio/generate-audio.ts",
    "audio:verify": "tsx scripts/audio/verify-audio.ts",
    "audio:preview": "vite audio-preview"
  },
  "dependencies": {
    "react": "^19.1.1",
    "react-dom": "^19.1.1"
  },
  "devDependencies": {
    "@audio/encode-ogg": "1.2.2",
    "@testing-library/react": "^16.3.0",
    "@types/node": "^22.17.2",
    "@types/react": "^19.1.10",
    "@types/react-dom": "^19.1.7",
    "jsdom": "^26.1.0",
    "tsx": "^4.20.4",
    "typescript": "^5.9.2",
    "vite": "^7.1.2",
    "vitest": "^3.2.4"
  }
}
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["node", "vitest/globals"]
  },
  "include": ["scripts/**/*.ts", "src/**/*.ts", "src/**/*.tsx", "audio-preview/**/*.tsx", "vitest.config.ts"]
}
```

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environmentMatchGlobs: [["src/audio/__tests__/react*.test.tsx", "jsdom"]],
    restoreMocks: true,
  },
});
```

- [ ] **Step 3: Install exact dependency graph**

Run: `npm install`

Expected: `package-lock.json` created; install exits 0.

- [ ] **Step 4: Add licenses**

Write standard MIT license in root `LICENSE` with `Copyright (c) 2026 Vitor Toledo`. Add `THIRD_PARTY_NOTICES.md` entries for `@audio/encode-ogg` (MIT), `wasm-media-encoders` (MIT), libogg (BSD-3-Clause style), and libvorbis (BSD-3-Clause style), including package versions and source URLs.

- [ ] **Step 5: Run smoke checks**

Run: `npm test -- src/audio/__tests__/toolchain.test.ts && npm run typecheck`

Expected: 1 test passes; TypeScript exits 0.

- [ ] **Step 6: Commit workspace**

```bash
git add LICENSE THIRD_PARTY_NOTICES.md package.json package-lock.json tsconfig.json vitest.config.ts src/audio/__tests__/toolchain.test.ts
git commit -m "chore: add licensed audio toolchain"
```

---

### Task 2: Deterministic DSP and WAV Foundation

**Files:**
- Create: `scripts/audio/constants.ts`
- Create: `scripts/audio/random.ts`
- Create: `scripts/audio/dsp.ts`
- Create: `scripts/audio/analysis.ts`
- Create: `scripts/audio/wav.ts`
- Create: `scripts/audio/__tests__/dsp.test.ts`
- Create: `scripts/audio/__tests__/wav.test.ts`

**Interfaces:**
- Consumes: no prior application code
- Produces: `StereoPcm`, `createPcm`, `mixTone`, `mixNoiseBurst`, `applyOnePoleLowPass`, `normalizeToPeak`, `masterToTargetRms`, `createRandom`, `measureAudio`, `encodeWav16`, and `readWavHeader`

- [ ] **Step 1: Write failing deterministic DSP tests**

```ts
// scripts/audio/__tests__/dsp.test.ts
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
```

```ts
// scripts/audio/__tests__/wav.test.ts
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
```

- [ ] **Step 2: Verify tests fail for missing modules**

Run: `npm test -- scripts/audio/__tests__/dsp.test.ts scripts/audio/__tests__/wav.test.ts`

Expected: FAIL with module resolution errors for `../random`, `../dsp`, and `../wav`.

- [ ] **Step 3: Implement constants and seeded random source**

```ts
// scripts/audio/constants.ts
export const SAMPLE_RATE = 44_100;
export const MUSIC_SECONDS = 48;
export const MUSIC_FRAMES = SAMPLE_RATE * MUSIC_SECONDS;
export const TEMPO_BPM = 90;
export const SECONDS_PER_BEAT = 60 / TEMPO_BPM;
export const BEATS_PER_BAR = 4;
export const MASTER_PEAK = 10 ** (-1 / 20);
export const TARGET_RMS_DBFS = -21; // restrained instrumental proxy for about -18 LUFS
export const GENERATION_SEED = 20_260_819;

// scripts/audio/random.ts
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}
```

- [ ] **Step 4: Implement PCM mixing and analysis**

Define `StereoPcm` as `{ sampleRate: number; left: Float32Array; right: Float32Array }`. `createPcm(seconds)` allocates exact rounded frame count. `mixTone` uses phase-continuous sine samples, equal-power pan, and a cosine attack/release envelope. `mixNoiseBurst` consumes injected `random`, applies same envelope, then `applyOnePoleLowPass`. `normalizeToPeak` scales both channels only when current peak exceeds zero. `masterToTargetRms` scales toward requested RMS, then reduces gain if estimated true peak would cross ceiling. `measureAudio` returns exact duration, sample peak, four-times linearly interpolated true-peak estimate, RMS, non-silent sample count, and maximum absolute start/end boundary jump.

```ts
export type ToneOptions = {
  start: number;
  duration: number;
  frequency: number;
  gain: number;
  pan: number;
  attack?: number;
  release?: number;
  partials?: ReadonlyArray<{ ratio: number; gain: number }>;
};

export type AudioMetrics = {
  duration: number;
  peak: number;
  truePeak: number;
  rms: number;
  nonSilentSamples: number;
  boundaryJump: number;
};
```

- [ ] **Step 5: Implement canonical WAV encoding**

Write 44-byte RIFF/WAVE header with `fmt ` PCM chunk, stereo channel count, 44.1 kHz sample rate, 16-bit depth, and interleaved clipped signed samples. `readWavHeader` validates `RIFF`, `WAVE`, `fmt `, and `data` markers before returning header values.

- [ ] **Step 6: Run foundation tests**

Run: `npm test -- scripts/audio/__tests__/dsp.test.ts scripts/audio/__tests__/wav.test.ts && npm run typecheck`

Expected: all tests pass; TypeScript exits 0.

- [ ] **Step 7: Commit DSP foundation**

```bash
git add scripts/audio
git commit -m "feat: add deterministic audio DSP"
```

---

### Task 3: Original Music and City Ambience Renderers

**Files:**
- Create: `scripts/audio/composition.ts`
- Create: `scripts/audio/ambience.ts`
- Create: `scripts/audio/__tests__/composition.test.ts`
- Create: `scripts/audio/__tests__/ambience.test.ts`

**Interfaces:**
- Consumes: Task 2 `StereoPcm`, mixing primitives, constants, and seeded random source
- Produces: `renderCozyCityLoop(seed?: number): StereoPcm` and `renderAmbienceAssets(seed?: number): Record<AmbienceName, StereoPcm>`

- [ ] **Step 1: Write failing music contract test**

```ts
// scripts/audio/__tests__/composition.test.ts
import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { renderCozyCityLoop } from "../composition";
import { measureAudio } from "../analysis";

function pcmHash(pcm: ReturnType<typeof renderCozyCityLoop>): string {
  return createHash("sha256")
    .update(Buffer.from(pcm.left.buffer))
    .update(Buffer.from(pcm.right.buffer))
    .digest("hex");
}

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
```

- [ ] **Step 2: Write failing ambience contract test**

```ts
// scripts/audio/__tests__/ambience.test.ts
import { expect, it } from "vitest";
import { renderAmbienceAssets } from "../ambience";
import { measureAudio } from "../analysis";

it("renders five distinct bounded ambience assets", () => {
  const assets = renderAmbienceAssets();
  expect(Object.keys(assets).sort()).toEqual([
    "bicycle-bell", "birds", "crosswalk-chirp", "distant-bus", "footsteps",
  ]);
  for (const pcm of Object.values(assets)) {
    const metrics = measureAudio(pcm);
    expect(metrics.duration).toBeGreaterThan(0.4);
    expect(metrics.duration).toBeLessThanOrEqual(5);
    expect(metrics.peak).toBeLessThanOrEqual(10 ** (-1 / 20) + 1e-6);
    expect(metrics.nonSilentSamples).toBeGreaterThan(1_000);
  }
});
```

- [ ] **Step 3: Verify renderer tests fail**

Run: `npm test -- scripts/audio/__tests__/composition.test.ts scripts/audio/__tests__/ambience.test.ts`

Expected: FAIL because renderer modules do not exist.

- [ ] **Step 4: Implement original 18-bar composition**

Use this bar progression and original four-note motif; MIDI values convert through `440 * 2 ** ((midi - 69) / 12)`:

```ts
const CHORDS = [
  [48, 52, 55, 57], // C6
  [52, 55, 59, 62], // Em7
  [53, 57, 60, 64], // Fmaj7
  [48, 52, 55, 57], [47, 50, 55, 59], [45, 48, 52, 55],
  [52, 55, 59, 62], [53, 57, 60, 64], [55, 59, 62, 64],
  [50, 53, 57, 60], [55, 59, 62, 65], [48, 52, 55, 59],
  [45, 49, 52, 55], [50, 53, 57, 60], [55, 59, 62, 64],
  [53, 57, 60, 64], [55, 59, 62, 64], [48, 52, 55, 57],
] as const;

const MOTIF = [64, 67, 69, 67] as const; // E-G-A-G; original project motif
```

Render three-bar intro, six-bar variation A, six-bar variation B, and three-bar return. Build marimba from `1.0`, `0.28`, and `0.12` partial gains at ratios `1`, `2`, and `3.9`; electric piano from longer sine partials; bass from sine plus quiet triangle approximation; brushes from filtered seeded noise; bell from ratios `1`, `2.01`, and `3.97`. Keep first and final 40 ms free of one-shot transients, apply short equal-power edge crossfade, then call `masterToTargetRms(pcm, TARGET_RMS_DBFS, MASTER_PEAK)`. Treat -21 dBFS RMS as reproducible mastering proxy; manual audition confirms approximate -18 LUFS perception.

- [ ] **Step 5: Implement five original ambience renderers**

```ts
export type AmbienceName =
  | "birds"
  | "footsteps"
  | "bicycle-bell"
  | "crosswalk-chirp"
  | "distant-bus";

const DURATIONS: Record<AmbienceName, number> = {
  birds: 2.4,
  footsteps: 2.8,
  "bicycle-bell": 1.6,
  "crosswalk-chirp": 1.8,
  "distant-bus": 4.8,
};
```

Birds use new chirp contours at 1.7–3.1 kHz with alternating pans `-0.45`, `0.35`, and `0.6`; footsteps use alternating low-passed noise impacts at pans `-0.25` and `0.25`; bicycle bell uses two decaying inharmonic clusters at seeded pan between `-0.35` and `0.35`; crosswalk uses generic centered 1.15 kHz pulses with varied spacing rather than recorded regional cadence; bus uses centered low-passed deterministic noise plus quiet 73 Hz and 109.5 Hz motor partials under a slow pass-by envelope. Normalize each to no more than `MASTER_PEAK * 0.55`.

- [ ] **Step 6: Run renderer tests**

Run: `npm test -- scripts/audio/__tests__/composition.test.ts scripts/audio/__tests__/ambience.test.ts && npm run typecheck`

Expected: all tests pass; TypeScript exits 0.

- [ ] **Step 7: Commit renderers**

```bash
git add scripts/audio/composition.ts scripts/audio/ambience.ts scripts/audio/__tests__
git commit -m "feat: compose cozy city audio"
```

---

### Task 4: Asset Export, CC0 Provenance, and Verification

**Files:**
- Create: `scripts/audio/export.ts`
- Create: `scripts/audio/generate-audio.ts`
- Create: `scripts/audio/verify-audio.ts`
- Create: `scripts/audio/__tests__/generation.test.ts`
- Create: `public/audio/LICENSE`
- Create: `public/audio/README.md`
- Create: `public/audio/manifest.json`
- Create: `public/audio/music/cozy-city-loop.wav`
- Create: `public/audio/music/cozy-city-loop.ogg`
- Create: `public/audio/sfx/*.ogg`

**Interfaces:**
- Consumes: Task 3 renderers, Task 2 WAV encoder, `@audio/encode-ogg@1.2.2`
- Produces: `generateAudio(outputRoot: string): Promise<AudioManifest>` and `verifyAudio(outputRoot: string): Promise<void>`

- [ ] **Step 1: Write failing generation integration test**

```ts
// scripts/audio/__tests__/generation.test.ts
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { generateAudio } from "../generate-audio";
import { verifyAudio } from "../verify-audio";

it("generates licensed deterministic runtime assets", async () => {
  const first = await mkdtemp(join(tmpdir(), "city-audio-a-"));
  const second = await mkdtemp(join(tmpdir(), "city-audio-b-"));
  const a = await generateAudio(first);
  const b = await generateAudio(second);
  expect(a.assets.map(({ path, sha256 }) => ({ path, sha256 })))
    .toEqual(b.assets.map(({ path, sha256 }) => ({ path, sha256 })));
  expect(a.assets).toHaveLength(7);
  expect(await readFile(join(first, "LICENSE"), "utf8")).toContain("CC0 1.0");
  await expect(verifyAudio(first)).resolves.toBeUndefined();
});
```

- [ ] **Step 2: Verify integration test fails**

Run: `npm test -- scripts/audio/__tests__/generation.test.ts`

Expected: FAIL because generation/export modules do not exist.

- [ ] **Step 3: Implement WAV and Ogg export**

`export.ts` creates directories, writes WAV with `encodeWav16`, encodes Ogg in-process, and hashes final bytes:

```ts
import ogg from "@audio/encode-ogg";

export async function encodeOgg(pcm: StereoPcm): Promise<Uint8Array> {
  const encoder = await ogg({ sampleRate: pcm.sampleRate, channels: 2, quality: 5 });
  const body = encoder.encode([pcm.left, pcm.right]);
  const tail = encoder.flush();
  encoder.free();
  const output = new Uint8Array(body.length + tail.length);
  output.set(body);
  output.set(tail, body.length);
  return output;
}
```

Generate one WAV master, one Ogg music file, and five Ogg SFX files. Sort manifest entries by path before JSON serialization. Store `path`, `sha256`, `bytes`, `duration`, `sampleRate`, `channels`, `seed`, and `license`.

- [ ] **Step 4: Implement verifier and command entry points**

`verifyAudio` checks all seven expected assets, SHA-256 matches, 48-second WAV header, nonempty Ogg files beginning with `OggS`, CC0 declaration, seed `20260819`, and no unexpected files under `music/` or `sfx/`. `generate-audio.ts` writes to `public/audio` only when executed as command; importing it remains side-effect free. `verify-audio.ts` runs verifier against same path and exits nonzero on failure.

- [ ] **Step 5: Add CC0 and provenance templates**

`public/audio/LICENSE` states CC0 1.0 waiver, links `https://creativecommons.org/publicdomain/zero/1.0/legalcode`, and names every generated export. `public/audio/README.md` records composition title, exact commands, seed, no-sample synthesis statement, Animal Crossing reference boundary, encoder package/version/license, and generated manifest table.

- [ ] **Step 6: Generate checked-in assets and verify**

Run: `npm run audio:generate && npm run audio:verify && npm test -- scripts/audio/__tests__/generation.test.ts`

Expected: seven assets generated; verification exits 0; integration test passes.

- [ ] **Step 7: Commit generated assets and provenance**

```bash
git add scripts/audio public/audio
git commit -m "feat: generate CC0 cozy city soundtrack"
```

---

### Task 5: Preferences and Sparse Ambience Scheduler

**Files:**
- Create: `src/audio/types.ts`
- Create: `src/audio/preferences.ts`
- Create: `src/audio/ambienceScheduler.ts`
- Create: `src/audio/__tests__/preferences.test.ts`
- Create: `src/audio/__tests__/ambienceScheduler.test.ts`

**Interfaces:**
- Consumes: browser-compatible storage and injected timer/random functions
- Produces: `AudioPreferences`, `DEFAULT_AUDIO_PREFERENCES`, `loadAudioPreferences`, `saveAudioPreferences`, and `AmbienceScheduler`

- [ ] **Step 1: Write failing preference tests**

```ts
import { expect, it } from "vitest";
import { DEFAULT_AUDIO_PREFERENCES, loadAudioPreferences } from "../preferences";

it("uses safe defaults for missing or malformed storage", () => {
  const storage = { getItem: () => "not-json", setItem: () => undefined };
  expect(loadAudioPreferences(storage)).toEqual(DEFAULT_AUDIO_PREFERENCES);
});

it("clamps persisted volumes", () => {
  const storage = { getItem: () => '{"muted":false,"musicVolume":3,"ambienceVolume":-2}', setItem: () => undefined };
  expect(loadAudioPreferences(storage)).toEqual({ muted: false, musicVolume: 1, ambienceVolume: 0 });
});
```

- [ ] **Step 2: Write failing scheduler tests**

```ts
import { describe, expect, it, vi } from "vitest";
import { AmbienceScheduler } from "../ambienceScheduler";

it("uses 8–22 second delays and avoids immediate repeats", () => {
  vi.useFakeTimers();
  const played: string[] = [];
  const scheduler = new AmbienceScheduler({
    random: () => 0,
    play: async (name) => { played.push(name); },
  });
  scheduler.start();
  vi.advanceTimersByTime(8_000);
  vi.advanceTimersByTime(8_000);
  expect(played.length).toBe(2);
  expect(played[0]).not.toBe(played[1]);
  vi.useRealTimers();
});
```

- [ ] **Step 3: Verify tests fail**

Run: `npm test -- src/audio/__tests__/preferences.test.ts src/audio/__tests__/ambienceScheduler.test.ts`

Expected: FAIL because runtime modules do not exist.

- [ ] **Step 4: Implement preference contract**

```ts
// src/audio/types.ts
export type AudioPreferences = {
  muted: boolean;
  musicVolume: number;
  ambienceVolume: number;
};

export const AMBIENCE_NAMES = [
  "birds", "footsteps", "bicycle-bell", "crosswalk-chirp", "distant-bus",
] as const;
export type AmbienceName = (typeof AMBIENCE_NAMES)[number];

// src/audio/preferences.ts
export const AUDIO_PREFERENCES_KEY = "ai-city-mayor.audio.v1";
export const DEFAULT_AUDIO_PREFERENCES: AudioPreferences = {
  muted: false,
  musicVolume: 0.35,
  ambienceVolume: 0.25,
};
```

Parse only boolean `muted` and finite numeric volumes; clamp volumes to `[0, 1]`; catch storage read/write exceptions; persist no other field.

- [ ] **Step 5: Implement weighted scheduler**

Weights: birds `4`, footsteps `4`, bicycle bell `2`, crosswalk chirp `2`, distant bus `1`. Constructor accepts `random`, async `play`, `setTimeout`, and `clearTimeout`. Each delay is `8000 + floor(random() * 14001)`. Exclude previous name before weighted choice. Do not schedule next timer until current `play` promise settles. `pause()` cancels timer without queueing; `resume()` starts fresh delay; `stop()` clears previous-name state.

- [ ] **Step 6: Run scheduler and preference tests**

Run: `npm test -- src/audio/__tests__/preferences.test.ts src/audio/__tests__/ambienceScheduler.test.ts && npm run typecheck`

Expected: all tests pass; TypeScript exits 0.

- [ ] **Step 7: Commit pure runtime logic**

```bash
git add src/audio
git commit -m "feat: schedule sparse city ambience"
```

---

### Task 6: Web Audio Director and Voice Ducking

**Files:**
- Create: `src/audio/webAudioDirector.ts`
- Create: `src/audio/__tests__/webAudioDirector.test.ts`
- Modify: `src/audio/types.ts`

**Interfaces:**
- Consumes: Task 5 preferences/scheduler and browser `AudioContext`
- Produces: `AudioDirector` interface and `createWebAudioDirector(options?: AudioDirectorOptions): AudioDirector`

- [ ] **Step 1: Write failing director contract tests**

Use small fakes for `AudioContext`, `GainNode`, `AudioBufferSourceNode`, `fetch`, and `Document`. Assert:

```ts
it("loops music after unlock and ducks/restores exact gains", async () => {
  const harness = createAudioHarness();
  const director = createWebAudioDirector(harness.options);
  await director.unlock();
  await director.startMusic();
  expect(harness.lastSource.loop).toBe(true);
  director.beginVoice();
  expect(harness.musicGain.lastTarget).toBeCloseTo(0.35 * 10 ** (-8 / 20));
  expect(harness.ambienceGain.lastTarget).toBeCloseTo(0.25 * 10 ** (-10 / 20));
  director.endVoice();
  expect(harness.musicGain.lastTarget).toBeCloseTo(0.35);
  expect(harness.ambienceGain.lastTarget).toBeCloseTo(0.25);
});

it("continues silently when all asset requests fail", async () => {
  const harness = createAudioHarness({ fetchRejects: true });
  const director = createWebAudioDirector(harness.options);
  await expect(director.unlock()).resolves.toBeUndefined();
  await expect(director.startMusic()).resolves.toBeUndefined();
  director.dispose();
});
```

- [ ] **Step 2: Verify director tests fail**

Run: `npm test -- src/audio/__tests__/webAudioDirector.test.ts`

Expected: FAIL because director and harness do not exist.

- [ ] **Step 3: Define public director contract**

```ts
export type AudioDirectorOptions = {
  contextFactory?: () => AudioContext;
  fetcher?: typeof fetch;
  documentRef?: Pick<Document, "visibilityState" | "addEventListener" | "removeEventListener">;
  storage?: Pick<Storage, "getItem" | "setItem">;
  random?: () => number;
  setTimer?: typeof setTimeout;
  clearTimer?: typeof clearTimeout;
};

export type AudioDirector = {
  unlock(): Promise<void>;
  startMusic(): Promise<void>;
  stopMusic(): void;
  setPreferences(next: AudioPreferences): void;
  getPreferences(): AudioPreferences;
  beginVoice(): void;
  endVoice(): void;
  subscribe(listener: (preferences: AudioPreferences) => void): () => void;
  dispose(): void;
};
```

- [ ] **Step 4: Implement Web Audio graph**

Create graph `music source -> music gain -> master gain -> destination` and `ambience source -> ambience gain -> master gain -> destination`. `unlock` creates/resumes one context and loads assets independently. `startMusic` creates one looping `AudioBufferSourceNode`; repeated calls are idempotent. Master mute sets master gain to `0` without overwriting channel levels. Gain changes use `setTargetAtTime` with 30 ms time constant. Music URL is `/audio/music/cozy-city-loop.ogg`; SFX URLs map directly from `AMBIENCE_NAMES`.

- [ ] **Step 5: Implement ducking, visibility, and cleanup**

Maintain integer voice-depth counter so overlapping speech calls cannot restore early. First `beginVoice` applies dB multipliers; final matching `endVoice` restores current preference levels. `visibilitychange` pauses scheduler while hidden and resumes with fresh delay when visible. Failed buffers are removed from scheduler pool. `dispose` removes listener, cancels timer, stops sources, disconnects nodes, and closes owned context. Every async path catches expected decode/load failures and leaves director usable.

- [ ] **Step 6: Run director tests**

Run: `npm test -- src/audio/__tests__/webAudioDirector.test.ts && npm run typecheck`

Expected: director success, failure, ducking, visibility, idempotence, and disposal tests pass.

- [ ] **Step 7: Commit Audio Director**

```bash
git add src/audio/types.ts src/audio/webAudioDirector.ts src/audio/__tests__/webAudioDirector.test.ts
git commit -m "feat: add browser audio director"
```

---

### Task 7: React Controls and Listening Preview

**Files:**
- Create: `src/audio/AudioProvider.tsx`
- Create: `src/audio/AudioControls.tsx`
- Create: `src/audio/index.ts`
- Create: `src/audio/__tests__/reactAudioControls.test.tsx`
- Create: `audio-preview/index.html`
- Create: `audio-preview/main.tsx`

**Interfaces:**
- Consumes: Task 6 `AudioDirector`
- Produces: `AudioProvider`, `useAudioDirector`, `AudioControls`, and stable exports from `src/audio/index.ts`

- [ ] **Step 1: Write failing React control test**

```tsx
// src/audio/__tests__/reactAudioControls.test.tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { AudioControls } from "../AudioControls";

it("updates mute, music, and ambience preferences", () => {
  const setPreferences = vi.fn();
  render(<AudioControls preferences={{ muted: false, musicVolume: 0.35, ambienceVolume: 0.25 }} setPreferences={setPreferences} />);
  fireEvent.click(screen.getByRole("button", { name: "Mute audio" }));
  expect(setPreferences).toHaveBeenCalledWith({ muted: true, musicVolume: 0.35, ambienceVolume: 0.25 });
  fireEvent.change(screen.getByLabelText("Music volume"), { target: { value: "0.5" } });
  expect(setPreferences).toHaveBeenCalledWith({ muted: false, musicVolume: 0.5, ambienceVolume: 0.25 });
});
```

- [ ] **Step 2: Verify React test fails**

Run: `npm test -- src/audio/__tests__/reactAudioControls.test.tsx`

Expected: FAIL because control components do not exist.

- [ ] **Step 3: Implement provider lifecycle**

`AudioProvider` creates director once, subscribes to preferences, and registers one capture-phase `pointerdown` listener. First pointer interaction calls `unlock` then `startMusic`, removes listener, and never intercepts event. Cleanup unsubscribes and disposes director. Context exposes director and current preferences. `useAudioDirector` throws descriptive error outside provider.

Provider never reads `prefers-reduced-motion` to alter sound. Audio remains governed only by explicit mute and volume controls.

- [ ] **Step 4: Implement accessible controls**

`AudioControls` renders button with changing `Mute audio`/`Unmute audio` accessible name and two range inputs with `min="0"`, `max="1"`, `step="0.05"`. Each update copies current preferences and changes one field. Sliders remain enabled while muted so preferred levels can be prepared before unmuting.

- [ ] **Step 5: Add public exports and preview**

```ts
// src/audio/index.ts
export { AudioControls } from "./AudioControls";
export { AudioProvider, useAudioDirector } from "./AudioProvider";
export { createWebAudioDirector } from "./webAudioDirector";
export type { AudioDirector, AudioPreferences } from "./types";
```

`audio-preview/main.tsx` mounts `AudioProvider`, title “Cozy City Audio Preview,” short “Click anywhere to start audio” instruction, `AudioControls`, and buttons calling `beginVoice`/`endVoice` to audition ducking. Keep preview CSS inline and neutral; preview is verification harness, not game UI.

- [ ] **Step 6: Run component and full automated checks**

Run: `npm test -- src/audio/__tests__/reactAudioControls.test.tsx && npm test && npm run typecheck && npm run audio:verify`

Expected: all tests pass; typecheck and audio verification exit 0.

- [ ] **Step 7: Manually audition runtime behavior**

Run: `npm run audio:preview`

Open printed local URL. Confirm first interaction unlocks audio, loop boundary has no click, five ambience types remain subtle, mute responds immediately, sliders work, voice audition ducks/restores, and hidden tab does not queue effects. Listen once on headphones and once on laptop speakers.

- [ ] **Step 8: Commit controls and preview**

```bash
git add src/audio audio-preview
git commit -m "feat: add cozy city audio controls"
```

---

### Task 8: Final Copyright and Acceptance Audit

**Files:**
- Modify: `public/audio/README.md`
- Modify: `THIRD_PARTY_NOTICES.md`

**Interfaces:**
- Consumes: all generated assets and runtime code
- Produces: verified, reviewable audio deliverable ready for main game integration

- [ ] **Step 1: Run clean reproducibility check**

Run: `npm run audio:generate && npm run audio:verify && npm test && npm run typecheck && git diff --exit-code public/audio`

Expected: generation and tests pass; no generated asset diff.

- [ ] **Step 2: Inspect dependency and asset provenance**

Run: `npm ls --all && rg -n "sample|Animal Crossing|license|CC0|MIT|libogg|libvorbis" public/audio/README.md public/audio/LICENSE THIRD_PARTY_NOTICES.md docs/superpowers/specs/2026-08-19-cozy-city-audio-design.md`

Expected: every dependency and output has clear license/provenance; no imported sample claim exists; reference boundary remains explicit.

- [ ] **Step 3: Measure final deliverables**

Run: `npm run audio:verify`

Record asset sizes, durations, peak values, manifest hashes, and manual playback results in `public/audio/README.md`. Confirm loop plays at least ten minutes without timing drift or audible gap.

- [ ] **Step 4: Run repository verification**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; only intended audit documentation changes remain.

- [ ] **Step 5: Commit audit evidence**

```bash
git add public/audio/README.md THIRD_PARTY_NOTICES.md
git commit -m "docs: verify cozy city audio provenance"
```

## Main Game Integration Contract

Future game shell wraps City UI once with `AudioProvider` and renders `AudioControls` in settings. Generated citizen voice calls `beginVoice()` immediately before playback and calls `endVoice()` in `ended`, `error`, abort, and component cleanup paths. No quest reducer, OpenAI route, or Three.js scene imports audio internals; integration depends only on exports from `src/audio/index.ts`.
