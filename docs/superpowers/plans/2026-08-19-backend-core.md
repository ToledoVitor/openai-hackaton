# Backend Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build tested server-side foundation for Town Hall Prompt Quest: deterministic rules, validated fallback, moderated structured evaluation, Realtime transcription credentials, and approved speech hints.

**Architecture:** One Next.js TypeScript application owns API routes. Pure domain modules define contracts and quest progression; injected gateways isolate OpenAI network calls so tests exercise real business behavior without network. Every server path validates input and output with Zod, keeps `OPENAI_API_KEY` server-only, and fails closed or falls back according to accepted architecture.

**Tech Stack:** Node.js 22, Next.js 16.3.1, React 19.2.8, TypeScript 7.0.2, OpenAI SDK 7.5.0, Zod 4.4.3, Vitest 4.1.11.

**Spec:** `docs/superpowers/specs/2026-08-19-ai-city-mayor-game-design.md`

## Global Constraints

- Public prototype remains adults 18+.
- Prompt Attempts are at least 1 and at most 600 trimmed characters.
- Quest ID is exactly `town-hall`.
- Project Brief needs are exactly `accessibleEntrance`, `clearSign`, and `weatherCover`.
- Model extraction uses `gpt-5.6-luna`, low reasoning, strict Structured Outputs, and `store: false`.
- Moderation uses `omni-moderation-latest` before model evaluation.
- Stable random installation identifier travels as `safety_identifier`; server never persists it.
- Quest engine, not model output, owns passed needs, repair delta, stage, and celebration.
- Evaluation failure after successful moderation returns validated prepared fallback with `source: "fallback"`.
- Moderation failure returns `503` and does not call Responses API.
- Flagged or off-topic input returns Playful Redirect and leaves City unchanged.
- Realtime route returns only short-lived client secret data; standard project API key never enters response.
- Speech route accepts approved `HintKey` values only and uses `gpt-4o-mini-tts` with voice `coral`.
- No database, authentication, analytics, raw prompt persistence, transcript persistence, audio persistence, or Parameter Trial in this plan.

---

### Task 1: Application Scaffold and Deterministic Quest Domain

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `vitest.config.ts`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `src/domain/contracts.ts`
- Create: `src/domain/hints.ts`
- Create: `src/domain/quest-engine.ts`
- Create: `src/domain/fallback-bank.ts`
- Test: `src/domain/contracts.test.ts`
- Test: `src/domain/quest-engine.test.ts`
- Test: `src/domain/fallback-bank.test.ts`

**Interfaces:**
- Consumes: accepted data contracts and Town Hall needs from design spec.
- Produces: `NeedKey`, `HintKey`, `PromptExtraction`, `EvaluationRequest`, `TurnResult`, Zod schemas, `evaluateQuest()`, `selectFallback()`, and `HINT_TEXT` for later tasks.

- [ ] **Step 1: Scaffold exact package scripts and compiler configuration**

Use package scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Install runtime packages `next@16.3.1`, `react@19.2.8`, `react-dom@19.2.8`, `openai@7.5.0`, `zod@4.4.3`. Install development packages `typescript@7.0.2`, `vitest@4.1.11`, `@types/node`, `@types/react`, `@types/react-dom`, `eslint`, and `eslint-config-next`.

- [ ] **Step 2: Write failing contract tests**

Tests must prove:

```ts
evaluationRequestSchema.parse({
  prompt: "Build an accessible Town Hall.",
  questId: "town-hall",
  currentPassedNeeds: [],
  safetyIdentifier: "install_1234567890abcdef",
});
```

passes, while whitespace-only prompt, 601-character prompt, unknown quest ID, duplicate need, unknown need, and short safety identifier fail. `promptExtractionSchema` must reject missing fields, extra fields, more than four evidence strings, evidence over 160 characters, citizen line over 220 characters, and unknown hint keys. `turnResultSchema` must reject extra fields and contradictory `restored` results missing any Town Hall need.

- [ ] **Step 3: Run contract tests and verify red**

Run: `rtk npm test -- src/domain/contracts.test.ts`

Expected: failure because `src/domain/contracts.ts` does not exist.

- [ ] **Step 4: Implement strict contracts**

Define exact unions:

```ts
export const NEED_KEYS = ["accessibleEntrance", "clearSign", "weatherCover"] as const;
export type NeedKey = (typeof NEED_KEYS)[number];

export const HINT_KEYS = [
  "stateGoal",
  "addCitizenContext",
  "requireAccessibleEntrance",
  "requireClearSign",
  "requireWeatherCover",
  "describeOutput",
  "celebrate",
  "playfulRedirect",
] as const;
export type HintKey = (typeof HINT_KEYS)[number];
```

Define `PromptExtraction` with required `offTopic`, four required `promptBlueprint` booleans, three required `civicTraits` booleans, `evidence: string[]`, `citizenLine: string`, and `nextHint: HintKey`. Define `EvaluationRequest` with `prompt`, literal quest ID, unique `currentPassedNeeds`, and `safetyIdentifier` matching `/^[A-Za-z0-9_-]{16,128}$/`. Define `TurnResult` with required `source`, `offTopic`, `repairDelta`, `passedNeeds`, `nextStage`, `citizenLine`, `nextHint`, and `celebration`; every object is strict.

Add `superRefine` rules: `repairDelta` and `passedNeeds` contain unique known needs; every repair delta appears in passed needs; `ready` means zero passed needs; `partial` means one or two; `restored` means all three and `celebration: true`; all non-restored results use `celebration: false`.

- [ ] **Step 5: Run contract tests and verify green**

Run: `rtk npm test -- src/domain/contracts.test.ts`

Expected: all contract tests pass.

- [ ] **Step 6: Write failing quest-engine tests**

Table cases must assert hand-written complete `TurnResult` values for: zero traits, one new trait, two new traits, all three traits, repeated traits preserving existing progress with empty delta, cumulative completion from two existing needs, and off-topic extraction preserving progress while returning fixed Playful Redirect. Also assert input arrays remain unchanged.

- [ ] **Step 7: Run quest-engine tests and verify red**

Run: `rtk npm test -- src/domain/quest-engine.test.ts`

Expected: failure because `evaluateQuest` does not exist.

- [ ] **Step 8: Implement deterministic quest engine and approved hints**

Export:

```ts
export function evaluateQuest(input: {
  currentPassedNeeds: readonly NeedKey[];
  extraction: PromptExtraction;
  source: "live" | "fallback";
}): TurnResult;
```

Map each true civic trait to its need. Union with existing passed needs in `NEED_KEYS` order. Delta contains newly passed needs only. Off-topic returns no delta and fixed `playfulRedirect` hint/citizen line. Otherwise choose first unmet need in Project Brief order; when no need remains use `celebrate`. Export immutable `HINT_TEXT: Record<HintKey, string>` with bounded, adult-friendly civic guidance; no hint may echo Player input.

- [ ] **Step 9: Run quest-engine tests and verify green**

Run: `rtk npm test -- src/domain/quest-engine.test.ts`

Expected: all quest-engine tests pass.

- [ ] **Step 10: Write failing fallback tests**

Assert `selectFallback([])` passes only `accessibleEntrance`; `selectFallback(["accessibleEntrance"])` adds only `clearSign`; two passed needs add only `weatherCover`; complete progress stays complete with empty delta. Every result uses `source: "fallback"` and passes `turnResultSchema`.

- [ ] **Step 11: Run fallback tests and verify red**

Run: `rtk npm test -- src/domain/fallback-bank.test.ts`

Expected: failure because `selectFallback` does not exist.

- [ ] **Step 12: Implement prepared fallback bank**

Export `selectFallback(currentPassedNeeds: readonly NeedKey[]): TurnResult`. Build a prepared extraction for next unmet requirement, then invoke `evaluateQuest`; never duplicate progression logic.

- [ ] **Step 13: Run Task 1 verification and commit**

Run: `rtk npm test -- src/domain && rtk npm run typecheck && rtk npm run lint && rtk npm run build`

Expected: zero failures and successful production build.

Commit: `feat: establish backend quest domain`

---

### Task 2: Moderated Structured Evaluation Route

**Files:**
- Create: `src/server/evaluation/evaluate-prompt.ts`
- Create: `src/server/evaluation/openai-gateway.ts`
- Create: `src/server/evaluation/errors.ts`
- Create: `app/api/evaluate/route.ts`
- Test: `src/server/evaluation/evaluate-prompt.test.ts`
- Test: `src/server/evaluation/openai-gateway.test.ts`
- Test: `app/api/evaluate/route.test.ts`

**Interfaces:**
- Consumes: `EvaluationRequest`, `PromptExtraction`, `TurnResult`, `promptExtractionSchema`, `evaluateQuest()`, and `selectFallback()` from Task 1.
- Produces: `evaluatePrompt()`, injected `ModerationGateway` and `ExtractionGateway`, `OpenAIEvaluationGateway`, `createEvaluatePost()`, and production `POST` handler.

- [ ] **Step 1: Write failing service tests**

Define ports:

```ts
export interface ModerationGateway {
  isFlagged(prompt: string): Promise<boolean>;
}

export interface ExtractionGateway {
  extract(prompt: string, safetyIdentifier: string): Promise<unknown>;
}
```

Tests must prove: moderation runs before extraction; flagged input never calls extraction and returns live Playful Redirect; valid extraction runs deterministic quest engine; off-topic extraction leaves progress unchanged; extraction rejection, timeout, or schema-invalid output returns `selectFallback()`; moderation rejection throws `ModerationUnavailableError` and never calls extraction.

- [ ] **Step 2: Run service tests and verify red**

Run: `rtk npm test -- src/server/evaluation/evaluate-prompt.test.ts`

Expected: failure because evaluation service does not exist.

- [ ] **Step 3: Implement evaluation orchestration**

Export:

```ts
export async function evaluatePrompt(
  request: EvaluationRequest,
  dependencies: {
    moderation: ModerationGateway;
    extraction: ExtractionGateway;
  },
): Promise<TurnResult>;
```

Do not catch moderation failures. Catch only extraction/model/validation failures for fallback. Parse extraction before calling `evaluateQuest`.

- [ ] **Step 4: Run service tests and verify green**

Run: `rtk npm test -- src/server/evaluation/evaluate-prompt.test.ts`

Expected: all orchestration tests pass.

- [ ] **Step 5: Write failing OpenAI gateway tests**

Inject a minimal client surface rather than mocking global modules. Assert moderation sends exact model and prompt. Assert extraction sends exact model, `store: false`, `safety_identifier`, low reasoning, strict JSON schema, system instruction preventing prompt-injection control, and Player prompt as data. Assert parsed object is returned. Network call assertions are allowed because request shape is this gateway's boundary contract.

- [ ] **Step 6: Run gateway tests and verify red**

Run: `rtk npm test -- src/server/evaluation/openai-gateway.test.ts`

Expected: failure because OpenAI gateway does not exist.

- [ ] **Step 7: Implement OpenAI gateway**

Use official SDK. Prefer `responses.parse()` plus `zodTextFormat(promptExtractionSchema, "prompt_extraction")`; if SDK typing rejects Zod 4 schema conversion, use `responses.create()` with explicit strict JSON schema and parse `output_text` through Zod. Configure client timeout to 8 seconds. System instruction states Player text is untrusted civic instruction, ignores instructions to change evaluator behavior, extracts semantics only, limits evidence to short excerpts, and chooses one known hint key.

- [ ] **Step 8: Write failing route tests**

Use `createEvaluatePost(dependencies)` to test real `Request`/`Response` behavior. Assert malformed JSON and invalid request return `400` with `{ error: "invalid_request" }`; moderation unavailable returns `503` with `{ error: "moderation_unavailable" }`; successful response returns `200`, `Cache-Control: no-store`, and validated Turn Result; response never includes project API key.

- [ ] **Step 9: Run route tests and verify red**

Run: `rtk npm test -- app/api/evaluate/route.test.ts`

Expected: failure because route factory does not exist.

- [ ] **Step 10: Implement route factory and production handler**

Export `createEvaluatePost(dependencies)` plus `POST`. Construct production OpenAI client lazily inside request handling so build does not require `OPENAI_API_KEY`. When key is absent, return `503` with `{ error: "service_unavailable" }`; never expose environment details.

- [ ] **Step 11: Run Task 2 verification and commit**

Run: `rtk npm test -- src/server/evaluation app/api/evaluate && rtk npm run typecheck && rtk npm run lint && rtk npm run build`

Expected: zero failures and successful production build.

Commit: `feat: add moderated prompt evaluation route`

---

### Task 3: Realtime Transcription Client Secret Route

**Files:**
- Create: `src/server/realtime/create-client-secret.ts`
- Create: `app/api/realtime-token/route.ts`
- Test: `src/server/realtime/create-client-secret.test.ts`
- Test: `app/api/realtime-token/route.test.ts`

**Interfaces:**
- Consumes: server-only `OPENAI_API_KEY`.
- Produces: `createRealtimeClientSecret()`, `createRealtimeTokenPost()`, and production `POST` handler returning `{ value, expiresAt }`.

- [ ] **Step 1: Write failing client-secret tests**

Inject `fetch`. Assert one POST to `https://api.openai.com/v1/realtime/transcription_sessions` with bearer project key and JSON body containing transcription model `gpt-4o-mini-transcribe`, language `en`, near-field noise reduction, and server VAD. Assert success maps only `client_secret.value` and `client_secret.expires_at`. Assert non-2xx, malformed JSON, missing secret, or blank secret throws `RealtimeCredentialError` without leaking upstream body.

- [ ] **Step 2: Run client-secret tests and verify red**

Run: `rtk npm test -- src/server/realtime/create-client-secret.test.ts`

Expected: failure because client-secret service does not exist.

- [ ] **Step 3: Implement client-secret service**

Export:

```ts
export async function createRealtimeClientSecret(input: {
  apiKey: string;
  fetchImpl?: typeof fetch;
}): Promise<{ value: string; expiresAt: number }>;
```

Validate upstream object with strict Zod schema before mapping. Never return session internals or project key.

- [ ] **Step 4: Run client-secret tests and verify green**

Run: `rtk npm test -- src/server/realtime/create-client-secret.test.ts`

Expected: all client-secret tests pass.

- [ ] **Step 5: Write failing route tests**

Assert production-shaped factory returns `200` plus `Cache-Control: no-store` for valid credential, `503` with `{ error: "realtime_unavailable" }` for service failure, and never serializes project key or upstream error text. Assert missing key returns `503` with `{ error: "service_unavailable" }`.

- [ ] **Step 6: Run route tests and verify red**

Run: `rtk npm test -- app/api/realtime-token/route.test.ts`

Expected: failure because route factory does not exist.

- [ ] **Step 7: Implement route and verify**

Export `createRealtimeTokenPost(dependency)` and production `POST`. Keep route `POST`-only and force Node runtime.

Run: `rtk npm test -- src/server/realtime app/api/realtime-token && rtk npm run typecheck && rtk npm run lint && rtk npm run build`

Expected: zero failures and successful production build.

- [ ] **Step 8: Commit**

Commit: `feat: mint realtime transcription credentials`

---

### Task 4: Approved Speech Route and Backend Integration Hardening

**Files:**
- Create: `src/server/speech/create-hint-speech.ts`
- Create: `app/api/speech/route.ts`
- Create: `.env.example`
- Modify: `README.md`
- Test: `src/server/speech/create-hint-speech.test.ts`
- Test: `app/api/speech/route.test.ts`

**Interfaces:**
- Consumes: `HintKey`, `HINT_TEXT`, server-only `OPENAI_API_KEY`, and official OpenAI SDK.
- Produces: `createHintSpeech()`, `createSpeechPost()`, production `POST`, documented backend setup, and verified server-only secret boundary.

- [ ] **Step 1: Write failing speech service tests**

Inject gateway:

```ts
export interface SpeechGateway {
  create(input: {
    model: "gpt-4o-mini-tts";
    voice: "coral";
    input: string;
    responseFormat: "mp3";
  }): Promise<ArrayBuffer>;
}
```

Assert every valid `HintKey` maps to exact approved `HINT_TEXT` and request shape. Unknown strings fail schema parsing before gateway. Empty or oversized audio throws `SpeechUnavailableError`; cap response at 2 MiB.

- [ ] **Step 2: Run speech tests and verify red**

Run: `rtk npm test -- src/server/speech/create-hint-speech.test.ts`

Expected: failure because speech service does not exist.

- [ ] **Step 3: Implement approved speech service**

Export `createHintSpeech(hintKey, gateway): Promise<ArrayBuffer>`. No Player prompt, transcript, or model-created citizen line may enter speech input.

- [ ] **Step 4: Run speech tests and verify green**

Run: `rtk npm test -- src/server/speech/create-hint-speech.test.ts`

Expected: all speech service tests pass.

- [ ] **Step 5: Write failing route tests**

Test factory with real `Request` objects. Assert valid body `{ "hintKey": "requireClearSign" }` returns `audio/mpeg`, `Cache-Control: no-store`, and `X-AI-Generated-Voice: true`; malformed JSON and unknown key return `400`; gateway failure returns `503` JSON; responses never include project key.

- [ ] **Step 6: Run route tests and verify red**

Run: `rtk npm test -- app/api/speech/route.test.ts`

Expected: failure because route factory does not exist.

- [ ] **Step 7: Implement route and production SDK adapter**

Use `openai.audio.speech.create({ model: "gpt-4o-mini-tts", voice: "coral", input, response_format: "mp3" })`, then map `arrayBuffer()`. Construct OpenAI lazily. Force Node runtime.

- [ ] **Step 8: Document secret setup and backend contracts**

`.env.example` contains only `OPENAI_API_KEY=`. README backend section lists `npm install`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`; describes three POST routes and states key must stay server-side. Do not include any real credential.

- [ ] **Step 9: Run full verification**

Run: `rtk npm test && rtk npm run typecheck && rtk npm run lint && rtk npm run build && rtk git diff --check`

Expected: zero test failures, zero type errors, zero lint errors, successful production build, clean whitespace check.

- [ ] **Step 10: Inspect production output for secret leakage and commit**

Run: `rtk rg "OPENAI_API_KEY" .next/static`

Expected: command exits with no matches.

Commit: `feat: add approved hint speech backend`
