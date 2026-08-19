# Mission Evaluation API — Accelerated Implementation Record

**Status:** Implemented

**Date:** 2026-08-19

**Spec:** `docs/superpowers/specs/2026-08-19-mission-evaluation-api-design.md`

## Delivered

- Stateless bilingual mission contract for `new_school`, `safe_path`, `unexpected_event`, and `city_school`.
- Exact `portuguese` or `english` parameter; no language auto-detection.
- Semantic extraction through OpenAI Structured Outputs with deterministic local progression.
- Local bilingual feedback and conservative fallback extraction.
- Canonical 45-key effect contract matching `docs/ASSET-EFFECT-CATALOG.md`.
- Real Mission 4 temperature trial using `0.2`, `0.7`, or `1.2`.
- Existing Town Hall evaluator retained for current UI compatibility.
- Realtime speech-to-speech client-secret endpoint with mission context, server VAD, input transcription, and `submit_prompt` tool.
- Browser relay protocol: Realtime tool call → `/api/evaluate` → function-call output → spoken explanation.
- Project API key remains server-only; browser receives short-lived credential.
- Existing Cloudflare paid-route quotas retained: evaluate 10/minute, Realtime session 5/minute, speech 10/minute per client.

## Main files

```text
app/api/evaluate/route.ts
app/api/realtime-token/route.ts
src/domain/mission-contracts.ts
src/domain/missions/types.ts
src/domain/missions/mission-registry.ts
src/domain/missions/evaluate-mission.ts
src/domain/missions/feedback.ts
src/domain/missions/fallback.ts
src/server/evaluation/openai-gateway.ts
src/server/evaluation/evaluate-prompt.ts
src/server/evaluation/temperature-trial.ts
src/server/realtime/create-client-secret.ts
src/server/realtime/realtime-instructions.ts
docs/API.md
docs/ASSET-EFFECT-CATALOG.md
```

## Verification scope

User requested accelerated delivery without new test files. Delivery gates:

- TypeScript typecheck.
- Production build.
- Diff review for key exposure, request bounds, language isolation, deterministic game authority, and documentation accuracy.

Automated mission fixtures, route coverage, Realtime payload tests, and live OpenAI integration tests remain follow-up work before production launch.

## Frontend handoff

Frontend owns WebRTC peer connection and microphone permission. It sends current mission state to `POST /api/realtime-token`, relays completed `submit_prompt` calls to `POST /api/evaluate`, returns evaluation JSON as function-call output, and applies city changes only from evaluator `progress` and `effectKeys`.

See `docs/API.md` for payloads and event sequence.
