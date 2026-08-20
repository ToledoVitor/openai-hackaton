# Entry city backdrop and sound controls review — 2026-08-20

## Decision

AI City now opens on a procedural streetscape instead of a gradient-only field. The source wordmark moves lower at desktop and mobile breakpoints, the primary action has more separation from its explanatory sentence, and explicit sound controls appear before profile submission. No media file, dependency, provider call, or permission prompt was added.

Sound remains optional. Loading the page, focusing controls, changing language, and opening the profile do not start playback. A deliberate unmute or volume action may start the existing CC0-backed audio manager. Mute plus both existing channel volumes continue to use the bounded `ai-city-mayor.audio.v2` local preference record; the entry and post-entry panels share one manager and synchronize through a local browser event.

## Affected invariants

- `src/game/main.ts` still waits for a valid `{ name, language }` profile before importing `src/game/runtime.ts`; entry presentation imports neither Three.js nor Realtime.
- `src/game/entry-presentation.ts` emits static decorative elements only. CSS draws buildings, vegetation, roadway, lights, and depth; it loads no asset URL.
- `src/audio/entryAudioControls.ts` adjusts existing music and ambience preferences in bounded `0..1` steps. No API, microphone, credential, or Realtime boundary is reachable.
- `app/page.tsx` no longer starts audio on any pointer or keyboard event. Playback follows explicit sound actions only.
- Portuguese and English labels cover group, mute/unmute, volume down/up, and live level output.
- Legacy `public/assets/brand/ai-city-logo.png` remains excluded. No rights claim or replacement media was introduced.

## TDD and offline evidence

RED was observed before implementation:

- missing `src/audio/entryAudioControls.ts` and `src/game/entry-presentation.ts` caused two focused suites to fail import;
- six sound-copy keys fell through to identical humanized strings, causing localization coverage to fail.

GREEN after minimal implementation: 4 focused files, 16 tests. Tests use an in-memory audio port and static markup; they create no `Audio`, fetch, microphone, provider, Realtime, or agent call. Repository-wide Vitest still installs `tests/offline-openai-guard.ts`, deletes `OPENAI_API_KEY`, and rejects OpenAI-host fetches.

## Bundle evidence

Exact Vinext production artifacts and Node `zlib` measurements:

| Boundary | Before raw / gzip / Brotli | After raw / gzip / Brotli | Timing |
| --- | ---: | ---: | --- |
| Page | 17,488 / 6,014 / 5,314 B (`page-CuylrnXc.js`) | 11,492 / 3,639 / 3,318 B (`page-2VFtYyd6.js`) | Initial |
| Entry bootstrap | 4,432 / 1,692 / 1,435 B (`main-B7x0mVZk.js`) | 6,563 / 2,251 / 1,958 B (`main-C4Mvsigy.js`) | Initial |
| Page + bootstrap | 21,920 / 7,706 / 6,749 B | 18,055 / 5,890 / 5,276 B | Initial |
| Three.js/game runtime | 724,662 / 186,617 / 153,871 B (`runtime-kmeMqWub.js`) | 724,697 / 186,635 / 153,800 B (`runtime-EDjW847R.js`) | After valid profile |

Initial JavaScript falls by 3,865 B raw, 1,816 B gzip, and 1,473 B Brotli. Shared entry/audio copy moved between page and bootstrap chunks, so both initial chunks must be compared together. Runtime raw delta is +35 B; Brotli variation is -71 B. Realtime remains a separate explicit-action chunk.

## Acceptance and remaining handoff

Source checks cover procedural/no-media markup, bilingual accessibility labels, preference clamping/persistence seam, no implicit playback, and unresolved-entry runtime deferral. Full test, typecheck, lint, and build gates are recorded in the sprint document.

Final offline gate: 46 test files and 254 tests passed; `npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check` passed. Build retains only the known post-entry runtime chunk-size warning.

Required browser matrix is 360×640, 390×844, 1280×720, and 1920×1080. Validate wordmark balance, CTA/helper spacing, all sound controls by keyboard/touch, language switch, persistence after reload, `scrollWidth === innerWidth`, profile submit, city render, and `window.cidadeViva`. Current managed execution sandbox rejected every localhost bind with `EPERM`; browser evidence therefore remains coordinator handoff, not a claimed pass.
