# Parallel Build Tracks Implementation Plan

**Goal:** Build missing non-UI foundations for AI City Mayor while backend APIs and visual work proceed independently.

**Spec:** `docs/superpowers/specs/2026-08-19-ai-city-mayor-game-design.md`

## Global Constraints

- Work test-first. Every behavioral production change must be preceded by a focused failing test and verified red-green cycle.
- Do not edit `package.json`, `package-lock.json`, framework configs, `app/**`, `src/domain/**`, existing backend files, UI components, scene files, or public assets.
- Reuse `NeedKey`, `TurnResult`, schemas, and `evaluateQuest()` from `src/domain/**`; never duplicate domain contracts or progression rules.
- Never persist raw prompts, transcripts, moderation results, model evidence, citizen lines, audio, API keys, or safety identifiers in logs.
- No database, authentication, analytics, Parameter Trial, or new dependency.
- Each task commits its work on its own branch and writes its report to controller-provided report path.

---

### Task 1: Client Quest State and Privacy-Safe Persistence

**Owned files:**

- Create: `src/game/quest-state.ts`
- Test: `src/game/quest-state.test.ts`
- Create: `src/client/quest-storage.ts`
- Test: `src/client/quest-storage.test.ts`
- Create: `src/client/installation-id.ts`
- Test: `src/client/installation-id.test.ts`

Build pure client state infrastructure for City Command.

Define narrative beats `arrival`, `discoverNeeds`, `readyToPrompt`, `evaluating`, `guidedRetry`, `restored`, `celebration`, and `districtTeaser`. State must include discovered needs, passed needs, attempt count, help tier `0 | 1 | 2 | 3`, Prompt Blueprint visibility, voice preference, live/fallback source, current pending request ID, and completion.

Implement reducer actions for inspecting Town Hall, discovering one citizen need, submitting an attempt with request ID, applying a `TurnResult` for that request ID, failing that request, advancing restored celebration, setting voice preference, and reset. Required behavior:

- all three discovered needs unlock prompting;
- only current request response can change state; stale or duplicate responses are ignored;
- passed needs merge monotonically in canonical `NEED_KEYS` order;
- off-topic results never alter passed needs;
- first unsuccessful on-topic result reveals Prompt Blueprint;
- unsuccessful on-topic attempts raise help tier, capped at 3;
- restored result moves to restored state and completion;
- reset returns clean quest state while preserving voice preference.

Implement versioned localStorage serialization/hydration through injected Storage-like interface. Persist only discovered needs, passed needs, attempt count, help tier, Blueprint visibility, voice preference, source, completion, and installation ID. Validate hydration strictly; malformed, unknown-version, contradictory, or unavailable storage returns safe defaults. Never serialize pending request IDs or Player/model content.

Implement installation ID creation through injected crypto source. Format must match backend safety identifier contract and use at least 128 bits of randomness. Reuse valid stored ID; replace invalid ID.

Tests must cover transitions, stale/duplicate responses, monotonic progress, off-topic handling, help cap, reset, round-trip hydration, every rejected storage shape, unavailable storage, persistence allowlist, stable ID reuse, invalid replacement, and format.

Run focused tests, full tests, typecheck, lint, and diff check. Commit as `feat: add client quest state`.

---

### Task 2: Fixed Semantic Fixture Harness

**Owned files:**

- Create: `src/evals/prompt-fixtures.ts`
- Create: `src/evals/fixture-runner.ts`
- Test: `src/evals/fixture-runner.test.ts`
- Create: `tests/fixtures/README.md`

Create eight fixed prompt fixtures named `vague`, `single-trait`, `complete`, `semantic-synonym`, `contradiction`, `off-topic`, `prompt-injection`, and `nonsense`. Each fixture contains Player prompt, current passed needs, expected civic traits, expected off-topic flag, and expected authoritative `TurnResult` projection: repair delta, passed needs, next stage, and celebration. Expectations must be hand-authored literals.

Build a network-independent runner accepting injected async extraction function. For every fixture it must:

1. call extractor with prompt;
2. validate returned value through `promptExtractionSchema`;
3. compare extracted `offTopic` and civic traits to fixture expectation;
4. pass validated extraction to `evaluateQuest()`;
5. compare authoritative projection;
6. return structured per-case pass/fail data without throwing away remaining cases.

Malformed extraction, extractor rejection, and timeout-like rejection become failed case results with bounded diagnostic codes; never include raw prompt, evidence, citizen line, or upstream error message. Provide aggregate totals and nonzero-failure boolean suitable for future CLI/CI adapter. No network client or command-line dependency in this task.

Tests must prove all eight cases pass with compliant injected extraction, semantic mismatch fails, malformed schema fails, rejection is redacted, remaining fixtures still run, and aggregate totals are correct. Documentation explains future live gateway adapter and privacy constraints without claiming live API verification.

Run focused tests, full tests, typecheck, lint, and diff check. Commit as `test: add semantic fixture harness`.

---

### Task 3: Public API Guardrail Primitives

**Owned files:**

- Create: `src/server/guardrails/rate-limiter.ts`
- Test: `src/server/guardrails/rate-limiter.test.ts`
- Create: `src/server/guardrails/request-body.ts`
- Test: `src/server/guardrails/request-body.test.ts`
- Create: `src/server/guardrails/timeout.ts`
- Test: `src/server/guardrails/timeout.test.ts`
- Create: `src/server/guardrails/index.ts`

Create dependency-free primitives backend route owner can compose later.

Implement bounded in-memory fixed-window limiter with injected clock. Configuration requires positive integer limit, positive window duration, and positive maximum key count. `consume(key)` returns discriminated result containing allowed state, remaining count, and retry-after milliseconds when blocked. It must reset after window, isolate keys, evict expired entries before capacity eviction, use deterministic oldest-entry eviction when capacity remains full, reject blank/oversized keys, and never expose stored keys. Document that process-local limiting is best-effort only and provider/project spend caps remain mandatory.

Implement `readJsonWithLimit(request, maxBytes)` using actual body bytes, not only `Content-Length`. Reject missing/non-JSON content type, declared or actual oversized body, malformed JSON, empty body, and non-object JSON with stable typed error codes. Never echo request body or parse errors. Cap accepted `maxBytes` to a safe positive integer range.

Implement `withTimeout(operation, timeoutMs)` using injected or internal `AbortController`. Operation receives `AbortSignal`. Resolve normally before deadline; on deadline abort and reject with stable `UpstreamTimeoutError`; clear timer on every path; preserve non-timeout operation errors; validate timeout bounds. Handle operation settling after timeout without unhandled rejection.

Tests must use injected clock/timer seams where needed, avoid real sleeps, cover boundary sizes and Unicode byte length, limiter reset/eviction/isolation, timeout abort/cleanup/late rejection, typed errors, and redaction.

Run focused tests, full tests, typecheck, lint, and diff check. Commit as `feat: add public API guardrails`.

---

### Task 4: Codex Sites Runtime Compatibility

**Owned files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.gitignore`
- Create: `.openai/hosting.json`
- Create: `vite.config.ts`
- Create: `worker/index.ts`
- Modify only when required for compatibility: `next-env.d.ts`, `next.config.ts`, `tsconfig.json`, `vitest.config.ts`

Adapt committed Next App Router scaffold to supported Codex Sites capability path without changing application/domain/API source behavior. Use bundled Sites vinext starter versions and patterns from `/Users/vitortoledo/.codex/plugins/cache/openai-bundled/sites/0.1.37/skills/sites-building/templates/vinext-starter` as compatibility authority.

Required behavior:

- use `vinext` for `dev`, `build`, and `start`;
- include `@openai/sites-vite-plugin`, `@cloudflare/vite-plugin`, Vite, Wrangler, and required RSC dependencies at bundled compatible versions;
- configure `sites()`, `vinext()`, and Cloudflare plugin for Worker-compatible ESM with `nodejs_compat`;
- provide Worker entry delegating App Router requests and secure image optimization handling;
- create unprovisioned `.openai/hosting.json` with no invented project ID and no D1/R2 bindings;
- pin Node engine to Sites-supported baseline;
- preserve Vitest test discovery and existing lint/typecheck behavior;
- ignore Wrangler/local deployment artifacts;
- never add secrets or deploy/publish from this task.

Verify existing 30-test baseline, typecheck, lint, standard Sites/vinext production build, and diff check. Inspect build output for successful API route compilation. Record any incompatibility with `export const runtime = "nodejs"`, OpenAI SDK, Next 16.3.1, or TypeScript 7 as concern instead of hiding it. Commit as `build: add Sites-compatible runtime`.

---

### Task 5: Paid API Route Hardening

**Owned files:**

- Modify: `app/api/evaluate/route.ts`
- Modify: `app/api/evaluate/route.test.ts`
- Modify: `app/api/realtime-token/route.ts`
- Modify: `app/api/realtime-token/route.test.ts`
- Modify: `app/api/speech/route.ts`
- Modify: `app/api/speech/route.test.ts`
- Modify: `src/server/evaluation/openai-gateway.ts`
- Modify: `src/server/evaluation/openai-gateway.test.ts`
- Modify when needed: `src/server/guardrails/**`

Close backend review blockers before public deployment. Compose existing guardrail primitives into all paid public routes without logging caller keys or request content.

Required behavior:

- configure evaluation and speech OpenAI clients with `maxRetries: 0`, making existing 8-second and 15-second timeouts total single-attempt deadlines;
- apply bounded request-body parsing to JSON routes before schema validation;
- apply route-specific rate limits with stable `429` JSON responses and `Retry-After` headers;
- derive limiter keys only from trusted server request metadata, not caller-controlled `safetyIdentifier` values;
- reject invalid/oversized bodies with stable, redacted `4xx` responses;
- preserve existing domain fallback and upstream error behavior;
- document process-local limiter limits and make Cloudflare/edge rate limiting plus OpenAI project hard spend caps explicit production release gates;
- never add secrets, content logging, deploy, or publish.

Tests must prove client construction disables retries, body limits cover declared and streamed sizes, each route returns redacted `429` responses at configured boundaries, independent routes/keys do not share counters accidentally, and existing route behavior remains intact. Run focused tests, full tests, typecheck, lint, production build, and diff check. Commit as `fix: harden paid API routes`.
