# AI City Overnight Sprint

## Delivered architecture

Player journey now follows entry → persisted language choice → explorable city → freely selected learning mission → server feedback → another mission or exploration.

- `src/domain/learning-journey.ts` is source of truth for typed independent missions: apartment construction, hospital construction, and diagnosis/correction of existing urban errors. Each mission owns pedagogical purpose, concept, objective, expected outcome, briefing, hint, completion feedback, next step, criteria, step, and allowed path.
- `src/client/journey-storage.ts` persists display state plus an opaque server receipt. `/api/progress` verifies its HMAC and installation binding before reload applies completion, city effects, or NPC improvement. Local active-mission choice is display-only.
- `src/game/main.ts` is a 4.2 KB raw entry bootstrap. It awaits name/language submission before importing `src/game/runtime.ts`, which owns Three.js and game orchestration. Runtime never computes a progression-critical score. Only a schema-valid server response with `status: "success"` reaches `completeLearningMission`.
- `src/domain/npc-dialogue.ts` supplies deterministic bilingual resident lines tied to canonical completion state. No NPC call uses an LLM.
- `src/game/exploration.ts` owns testable boundary and simple collision logic. Main scene maps WASD/arrows and ground click/touch to camera-target exploration.
- `src/client/ui-copy.ts` owns shell, loading, empty, voice, and recoverable error copy. Mission learning copy remains beside typed mission metadata.

## Evaluation and Realtime decisions

- Browser submits a strict `EvaluateMissionRequest` only to `/api/evaluate`. Server validates request, applies body limits, moderation/extraction timeouts through OpenAI clients, and validates its own response before serialization.
- Browser-claimed prior criteria and selected paths are discarded at the server boundary. Only current server-side extraction may determine success.
- Provider structured-extraction failure is fail-closed. Deterministic fallback may diagnose prompt content, but always returns retry with `evaluation_unavailable_no_change`; it cannot approve progression.
- Learning success includes a server-signed, installation-bound canonical completion-set receipt. `/api/evaluate` accepts any valid learning mission, verifies any supplied receipt, unions successful mission ID without duplicates, canonicalizes set order, and rejects results not bound to requested mission, step, and language.
- Worker applies per-IP quotas to paid POST routes only when trusted Cloudflare metadata exists. Local requests deliberately avoid a shared anonymous limiter.
- Every evaluation response, including errors, uses `Cache-Control: no-store` and `Pragma: no-cache`. Browser maps status classes to fixed translated messages and discards provider bodies.
- Permanent `OPENAI_API_KEY` is read only in server route modules. No `NEXT_PUBLIC_` secret exists. Client bundle scan found no permanent key name, key pattern, or bearer project credential.
- Realtime is lazy: no module load, credential, or microphone request occurs until player chooses voice. Microphone permission is requested before ephemeral credential creation, so denial incurs no provider request. Server accepts strict mission/language/progress scope, builds instructions and one `submit_prompt` tool, requests a 60-second client secret, rejects expired or over-120-second credentials, and returns only `value` plus `expiresAt`.
- Realtime tool output is evaluated through same `/api/evaluate` path. Voice model cannot grant progression or mutate city state directly.

## Automated-test isolation

Release rule: any live provider call from an automated test blocks release.

Vitest loads `tests/offline-openai-guard.ts` before every suite. Guard deletes `OPENAI_API_KEY` and rejects global `fetch` to `openai.com` or any subdomain. Provider, route, Realtime, and browser-client logic use injected deterministic fakes. Browser validation ran local server with `OPENAI_API_KEY` explicitly unset; evaluation verified translated provider-unavailable recovery without provider traffic.

## Product and scene decisions

- Existing logo, audio, sprites, GLTF models, and textures remain intact. Building positions/rotations now create varied streets; passive blocks use green ground plus shared CC0 bench/bush/streetlight clones and procedural instanced grass/bus shelters; mission zones remain visually clear.
- Existing camera framing remains mission focus. Exploration adds bounded direct movement without physics.
- UI uses one primary evaluation action, compact city state, three always-available mission choices, visible pedagogical purpose, resident reports, clear feedback, optional text/voice input, and responsive scroll containment.
- Language changes immediately, persists across reload, closes an active voice session, and clears stale feedback so one screen never mixes response languages.
- `window.cidadeViva` retains `estado`, `escolher`, `avancarMissao`, `reiniciar`, `focarMissao`, and `visaoGeral` for scene validation.

## Validation record

- Automated tests: 246 passing across 44 files at logo-exclusion final gate; global offline guard loaded for every suite.
- TypeScript: strict typecheck passes.
- ESLint: passes with zero warnings.
- Production build: passes.
- Historical ordered-flow fixture evidence remains valid for evaluation feedback/effects, but unlocking assertions were superseded by free choice on 2026-08-20.
- Visual/free-choice browser matrix: 360×640, 390×844, 1280×720, and 1920×1080. Entry showed no false spinner; language changed immediately; runtime appeared only after profile submit; all mission buttons were enabled; direct hospital selection updated purpose, NPC, camera, and prompt without housing completion; mobile/wide overlays had no horizontal overflow or control overlap.
- Bundle-phase browser recheck: desktop entry switched to English, submitted exact profile, loaded city and mission 1; mobile 390×844 repeated entry/city flow with `scrollWidth === innerWidth === 390`. `window.cidadeViva` is absent before entry by design and installed by deferred runtime module before mission start.
- Live OpenAI evaluation, live Realtime audio, and microphone permissions were not invoked automatically; those require explicit human testing with an operator-provided key.

## Bundle optimization record

Production Vinext build chunk graph before split loaded page chunk then imported whole game immediately during React mount. Sizes use exact file bytes plus Node `zlib` compression. After-values identify final-gate artifacts `page-Cs4Qbifh.js`, `main-CQAQTXZd.js`, and `runtime-b4dz8sYR.js`; content hashes can shift compressed byte counts across otherwise identical rebuilds.

| Boundary | Before raw / gzip / Brotli | After raw / gzip / Brotli | Load timing |
|---|---:|---:|---|
| Page | 45,927 / 15,320 / 13,799 B | 46,273 / 15,448 / 13,924 B | Initial |
| Game bootstrap | 725,811 / 186,978 / 154,212 B | 4,536 / 1,726 / 1,458 B | Initial |
| Three.js/game runtime | included above | 722,140 / 185,882 / 153,025 B | After valid profile submit |
| Page + game entry | 771,738 / 202,298 / 168,011 B | 50,809 / 17,174 / 15,382 B | Initial app-specific path |

Logo-exclusion build drops initial app-specific path by 749,818 B raw, 194,592 B gzip, and 161,247 B Brotli (97.2%, 96.2%, 96.0%). Shared framework/Vinext chunks are unchanged. Client-code commit `fe7b0cb` measured `page-*.js` at 17,488 / 6,013 / 5,326 B, `main-*.js` at 4,432 / 1,693 / 1,438 B, and `runtime-*.js` at 724,662 / 186,618 / 153,653 B raw/gzip/Brotli; content hashes and a few compressed bytes can shift across equivalent rebuilds. Initial page + bootstrap is 21,920 / 7,706 / 6,764 B: 28,889 / 9,468 / 8,618 B smaller than bundle-phase final because source wordmark removes image-component client code. Realtime remains separate at 4,386 / 1,871 / 1,618 B and loads only after explicit voice action. Three.js remains post-entry; deeper runtime split remains future measured work.

TDD evidence: unresolved entry test failed against previous DOM-eager module, then passed with deferred loader; exact-profile test failed with zero `runtime.start` calls, then passed after profile handoff. Post-review failure-state test failed before renderer existed, then passed with active-language error copy, stopped spinner, and explicit reload action. Wordmark tests failed first for missing source component and retained PNG, then passed after accessible markup replacement and asset deletion. Desktop/mobile browser showed entry before runtime/API, readable profile/header wordmarks, immediate language switch, then city after submit.

## Open-source readiness

- Root license changed from MIT to Apache-2.0, copyright 2026 Vitor Toledo. Owner is supported by prior repository license/plan text, primary commit identity, and repository remote; no owner was invented. Exact former MIT copyright/permission notice remains in `LICENSES/MIT-legacy.txt`, and notices state no separate relicensing authority over other contributors' copyrights.
- Added README, contribution guide, Contributor Covenant policy, security policy, templates, offline CI, Dependabot, NOTICE, and expanded third-party notices.
- CI explicitly empties OpenAI credential variables before install/test/typecheck/lint/build. Vitest global guard remains release-blocking protection against OpenAI host traffic.
- KayKit city assets, Quaternius characters, and OpenGameArt audio have bundled CC0 evidence.
- Legacy `public/assets/brand/ai-city-logo.png` had no authoritative source or license evidence, so it was deleted from current tree/current-tag source archives and replaced with source-authored HTML/CSS wordmark. Historical Git revisions predate exclusion and are not release artifacts. No origin, ownership, or generation claim is made about excluded file. Logo-provenance release blocker is closed for current source release by exclusion.

## Remaining risks

- Cloudflare IP quotas are process-local fixed windows. Multi-isolate deployments need platform-enforced distributed rate limiting plus project spend alerts for stronger abuse resistance.
- Realtime client secrets can be reused until expiry by any script already executing in same origin. Current 60-second TTL and mission scope limit impact; CSP and dependency hygiene remain important.
- Completion display is local, but no longer authoritative: edited local completed IDs are ignored at startup. Only installation-bound HMAC receipts verified by server restore independent completions. Active selection may come from local display state but grants no completion. Receipt signing currently derives from project API key, so key rotation intentionally resets demo progress.
- Deferred runtime greatly reduces initial JavaScript, but post-entry Three.js/game chunk remains 724,662 B raw. Model bytes and low-end mobile parse/render time need future profiling.
- Real provider quality and live Realtime audio still need explicit human testing with an operator-provided key; automated and agent-run validation intentionally stays offline.

## Future open-source contribution checklist

- [x] Add `SECURITY.md` with supported versions, private reporting channel, provider-spend threat model, and response expectations.
- [x] Add CI that runs test, typecheck, lint, build, and offline provider guard.
- [ ] Add deterministic browser harness that injects server evaluation fixtures without production-only flags.
- [ ] Add Cloudflare distributed rate-limit binding and documented OpenAI spend cap.
- [ ] Add CSP/security headers and dependency update policy.
- [ ] Add enforceable performance budgets and profile safe post-entry runtime sub-splits.
- [ ] Add human accessibility review with screen reader, reduced motion, contrast, keyboard, and touch devices.
- [ ] Add contributor guidance for bilingual copy completeness and mission metadata changes.
- [x] Add explicit licenses/attribution index and document legacy logo exclusion.
- [x] Replace unresolved logo with source-authored HTML/CSS wordmark and delete unlicensed media.
