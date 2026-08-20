# AI City Overnight Sprint

## Delivered architecture

Player journey now follows entry → persisted language choice → explorable city → ordered learning mission → server feedback → next mission.

- `src/domain/learning-journey.ts` is source of truth for typed mission metadata and order: apartment construction, hospital construction, then diagnosis/correction of existing urban errors. Each mission owns concept, objective, expected outcome, prerequisite, briefing, hint, completion feedback, next step, criteria, step, and allowed path.
- `src/client/journey-storage.ts` persists display state plus an opaque server receipt. `/api/progress` verifies its HMAC and installation binding before reload applies completion, city effects, NPC improvement, or unlocks.
- `src/game/main.ts` orchestrates presentation and scene changes. It never computes a progression-critical score. Only a schema-valid server response with `status: "success"` reaches `completeLearningMission`.
- `src/domain/npc-dialogue.ts` supplies deterministic bilingual resident lines tied to canonical completion state. No NPC call uses an LLM.
- `src/game/exploration.ts` owns testable boundary and simple collision logic. Main scene maps WASD/arrows and ground click/touch to camera-target exploration.
- `src/client/ui-copy.ts` owns shell, loading, empty, voice, and recoverable error copy. Mission learning copy remains beside typed mission metadata.

## Evaluation and Realtime decisions

- Browser submits a strict `EvaluateMissionRequest` only to `/api/evaluate`. Server validates request, applies body limits, moderation/extraction timeouts through OpenAI clients, and validates its own response before serialization.
- Browser-claimed prior criteria and selected paths are discarded at the server boundary. Only current server-side extraction may determine success.
- Provider structured-extraction failure is fail-closed. Deterministic fallback may diagnose prompt content, but always returns retry with `evaluation_unavailable_no_change`; it cannot approve progression.
- Learning success includes a server-signed, installation-bound ordered-progress receipt. `/api/evaluate` verifies prerequisite receipts before evaluating later missions and rejects schema-valid results not bound to requested mission, step, and language.
- Worker applies per-IP quotas to paid POST routes only when trusted Cloudflare metadata exists. Local requests deliberately avoid a shared anonymous limiter.
- Every evaluation response, including errors, uses `Cache-Control: no-store` and `Pragma: no-cache`. Browser maps status classes to fixed translated messages and discards provider bodies.
- Permanent `OPENAI_API_KEY` is read only in server route modules. No `NEXT_PUBLIC_` secret exists. Client bundle scan found no permanent key name, key pattern, or bearer project credential.
- Realtime is lazy: no credential or microphone request occurs until player chooses voice. Server accepts a strict mission/language/progress scope, builds instructions and one `submit_prompt` tool, requests a 60-second client secret, rejects expired or over-120-second credentials, and returns only `value` plus `expiresAt`.
- Realtime tool output is evaluated through same `/api/evaluate` path. Voice model cannot grant progression or mutate city state directly.

## Automated-test isolation

Release rule: any live provider call from an automated test blocks release.

Vitest loads `tests/offline-openai-guard.ts` before every suite. Guard deletes `OPENAI_API_KEY` and rejects global `fetch` to `openai.com` or any subdomain. Provider, route, Realtime, and browser-client logic use injected deterministic fakes. Browser validation ran local server with `OPENAI_API_KEY` explicitly unset; evaluation verified translated provider-unavailable recovery without provider traffic.

## Product and scene decisions

- Existing logo, audio, sprites, GLTF models, and textures remain intact. Existing construction lots/buildings represent housing and hospital outcomes; existing traffic lights, waste, dumpsters, water, people, roads, and vehicles represent urban state.
- Existing camera framing remains mission focus. Exploration adds bounded direct movement without physics.
- UI uses one primary evaluation action, compact city state, mission prerequisites, visible learning metadata, resident reports, clear feedback, and responsive scroll containment.
- Language changes immediately, persists across reload, closes an active voice session, and clears stale feedback so one screen never mixes response languages.
- `window.cidadeViva` retains `estado`, `escolher`, `avancarMissao`, `reiniciar`, `focarMissao`, and `visaoGeral` for scene validation.

## Validation record

- Automated tests: 221 passing across 34 files before final gate.
- TypeScript: strict typecheck passes.
- ESLint: passes with zero warnings.
- Production build: passes.
- Browser desktop 1280×720: entry, immediate English switch, reload persistence, locked missions, translated offline recovery, focus styles, resident reports, scene composition, and direct ground interaction checked.
- Full housing → hospital → urban repair success flow ran through a local deterministic HTTP fixture proxy: feedback, city metrics/effects, NPC improvement, next-mission unlocks, final completion, and signed-receipt reload were exercised without any provider credential or traffic.
- Browser mobile 390×844: no horizontal overflow; entry, city status, NPC panel, camera controls, mission metadata, and scrollable prompt flow remain usable.
- Live OpenAI evaluation, live Realtime audio, and microphone permissions were not invoked automatically; those require explicit human testing with an operator-provided key.

## Remaining risks

- Cloudflare IP quotas are process-local fixed windows. Multi-isolate deployments need platform-enforced distributed rate limiting plus project spend alerts for stronger abuse resistance.
- Realtime client secrets can be reused until expiry by any script already executing in same origin. Current 60-second TTL and mission scope limit impact; CSP and dependency hygiene remain important.
- Completion display is local, but no longer authoritative: edited local journey JSON is ignored at startup. Only installation-bound HMAC receipts verified by server can restore completion or satisfy server-side prerequisites. Receipt signing currently derives from project API key, so key rotation intentionally resets demo progress.
- Large Three.js client bundle remains a performance opportunity; split loading can improve low-end mobile startup.
- Real provider quality and live Realtime audio still need explicit human testing with an operator-provided key; automated and agent-run validation intentionally stays offline.

## Future open-source contribution checklist

- [ ] Add `SECURITY.md` with supported versions, private reporting channel, provider-spend threat model, and response expectations.
- [ ] Add CI that runs test, typecheck, lint, build, offline provider guard, and client-bundle secret scan.
- [ ] Add deterministic browser harness that injects server evaluation fixtures without production-only flags.
- [ ] Add Cloudflare distributed rate-limit binding and documented OpenAI spend cap.
- [ ] Add CSP/security headers and dependency update policy.
- [ ] Add performance budgets and route-level Three.js code splitting.
- [ ] Add human accessibility review with screen reader, reduced motion, contrast, keyboard, and touch devices.
- [ ] Add contributor guidance for bilingual copy completeness and mission metadata changes.
- [ ] Add explicit licenses/attribution index for every retained media asset.
