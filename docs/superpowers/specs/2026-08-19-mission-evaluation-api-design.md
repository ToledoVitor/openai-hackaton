# Mission Evaluation API — Design Specification

**Status:** Approved for implementation

**Date:** 2026-08-19

## Relationship to existing design

This specification supersedes the evaluation-API, mission-count, and localization portions of the original AI City Mayor design. ADR-0001 still governs semantic extraction plus deterministic rules, and ADR-0003 still governs server-side OpenAI credentials. UI, realtime-session setup, speech transport, and asset implementation remain outside this specification.

## Purpose

Provide one stateless server API that evaluates typed or transcribed Prompt Attempts for four missions in Portuguese or English. OpenAI interprets semantic meaning; versioned local rules decide progression. The API returns stable effect keys and localized feedback that both UI and GPT Realtime Voice can consume.

## Goals

- Evaluate natural Prompt Attempts without relying on exact keywords during normal operation.
- Support exactly `portuguese` and `english`, selected by an explicit request parameter.
- Never auto-detect language or silently change response language.
- Preserve progressive mission state supplied by the client without storing sessions server-side.
- Keep model judgment away from authoritative game progression.
- Return one stable response contract for every mission.
- Run a real temperature comparison during the fourth mission.
- Degrade safely and visibly when OpenAI calls fail.

## Non-goals

- UI, Three.js rendering, asset generation, Realtime connection setup, or speech synthesis.
- Server sessions, accounts, databases, prompt history, or analytics.
- Open-ended chat or model-authored game state.
- Supporting language values other than `portuguese` and `english`.
- Evals API, fine-tuning, retrieval, tools, or agents.

## Architecture

Use a single Next.js route:

```text
POST /api/missions/evaluate
  -> validate request
  -> resolve mission and language configuration
  -> moderate Prompt Attempt
  -> extract semantic traits with Structured Outputs
  -> optionally run real temperature generation
  -> validate model output
  -> apply deterministic mission rules
  -> select localized feedback and effect keys
  -> return Turn Result
```

### Components

`Mission registry` owns mission IDs, step IDs, paths, required criterion IDs, dependencies, effect mappings, bilingual evaluator instructions, and bilingual feedback keys.

`Prompt extractor` calls the Responses API with `gpt-5.6-luna`, low reasoning effort, `store: false`, and a strict mission-specific JSON Schema. It interprets meaning only.

`Mission evaluator` is a pure module. It filters client-supplied progress against the mission allowlist, merges newly extracted criteria, applies dependencies, derives status, and selects feedback/effect keys.

`Temperature trial` calls `gpt-5.2` with reasoning effort `none`, the selected temperature, default `top_p`, bounded output, and localized instructions.

`Feedback catalog` owns player-facing Portuguese and English text. Model prose never becomes authoritative coaching.

`Fallback extractor` provides a conservative bilingual lexicon for known demo language. It feeds the same deterministic evaluator as the live extractor.

## API contract

### Request

```ts
type MissionId =
  | "new_school"
  | "safe_path"
  | "unexpected_event"
  | "city_school";

type Language = "portuguese" | "english";

type MissionStepId =
  | "design"
  | "response_plan"
  | "creative_design"
  | "critical_instructions";

type EvaluateMissionRequest = {
  missionId: MissionId;
  stepId: MissionStepId;
  language: Language;
  prompt: string;
  attempt: number;
  satisfiedCriteria: string[];
  safetyIdentifier: string;
  temperatureChoice?: "low" | "medium" | "high";
};
```

Valid mission-step combinations:

| Mission | Allowed step |
|---|---|
| `new_school` | `design` |
| `safe_path` | `design` |
| `unexpected_event` | `response_plan` |
| `city_school` | `creative_design`, `critical_instructions` |

`temperatureChoice` is required for both `city_school` steps and forbidden for other missions. `prompt` is trimmed, must contain 1–600 Unicode characters, and is treated as untrusted data. `attempt` is a positive integer. `safetyIdentifier` is a random UUID v4 installation ID, not an account ID or PII.

### Internal model extraction

```ts
type MissionExtraction = {
  offTopic: boolean;
  choice: string | null;
  criteria: Record<
    string,
    {
      met: boolean;
      evidence: string;
    }
  >;
};
```

Each mission generates a closed JSON Schema:

- `choice` permits only that mission's two path IDs plus `null`.
- Every criterion key is required.
- Additional properties are rejected at every object level.
- `evidence` is a short prompt excerpt, not chain-of-thought.
- Local validation requires the exact criterion-key set and bounded evidence.
- Invalid, missing, duplicate, or contradictory output switches to fallback extraction.

### Success response

```ts
type EvaluateMissionResponse = {
  missionId: MissionId;
  stepId: MissionStepId;
  language: Language;
  source: "live" | "fallback";
  status: "redirected" | "retry" | "partial" | "success";
  choice: string | null;
  progress: {
    satisfied: string[];
    newlySatisfied: string[];
    missing: string[];
  };
  teachingConcept: string;
  feedback: {
    summary: string;
    explanation: string;
    nextInstruction: string | null;
  };
  effectKeys: string[];
  temperatureTrial?: TemperatureTrial;
};

type TemperatureTrial =
  | {
      status: "generated";
      choice: "low" | "medium" | "high";
      value: 0.2 | 0.7 | 1.2;
      generatedOutput: string;
      observationKey:
        | "creative_variety"
        | "creative_too_repetitive"
        | "critical_consistency"
        | "critical_too_unpredictable";
      errorCode: null;
    }
  | {
      status: "unavailable";
      choice: "low" | "medium" | "high";
      value: 0.2 | 0.7 | 1.2;
      generatedOutput: null;
      observationKey: null;
      errorCode: "temperature_generation_unavailable";
    };
```

`status` describes whole-mission progress. For `city_school`, completing `creative_design` normally yields `partial`; `success` requires required criteria from both steps. `feedback` is the single player-facing source used by UI and voice. `effectKeys` are defined by [Asset Effect Catalog](../../ASSET-EFFECT-CATALOG.md).

`effectKeys` is ordered. Its first item is the primary scene outcome for the attempt; remaining items are compatible overlays, trade-off states, or completion additions. Local rules return at most one mutually exclusive geometry state per scene layer. They select the primary failure from the first missing criterion in mission teaching order, except for documented comic first-attempt patterns such as `school_too_small`.

### Error response

```ts
type EvaluationErrorResponse = {
  error: {
    code:
      | "invalid_request"
      | "invalid_language"
      | "invalid_mission_step"
      | "temperature_required"
      | "temperature_not_allowed"
      | "too_many_requests"
      | "moderation_unavailable"
      | "internal_error";
    message: string;
    retryable: boolean;
    field?: string;
  };
  effectKeys?: string[];
};
```

`temperature_required` includes `effectKeys: ["temperature_missing"]`, allowing UI to render the empty temperature control while keeping validation failure explicit.

## Language behavior

The route selects one mission instruction set and one feedback catalog using `language`. It passes that language explicitly in developer instructions for both extraction and temperature generation.

- Missing or unsupported language returns `400 invalid_language`.
- The server performs no language detection.
- A prompt written in a different language does not change selected instructions or returned feedback language.
- The live multilingual model may still understand cross-language text; the API does not use that understanding to relabel the request.
- Fallback uses only the lexicon selected by the parameter, so cross-language text is not silently matched by another catalog.
- Equivalent Portuguese and English prompts must produce equivalent criterion and effect IDs.

## Deterministic progression

1. Filter `satisfiedCriteria` to criterion IDs allowed by the selected mission.
2. Ignore client IDs belonging to another mission or unknown versions.
3. Convert valid model extraction into candidate newly satisfied criteria.
4. Apply local dependencies. A path-specific criterion cannot pass while `choice` is `null`; a temperature-comparison criterion cannot pass if its live generation failed.
5. Union accepted new criteria with filtered previous progress. Progress never regresses within a session.
6. Derive `missing` from the mission's complete required set.
7. Return `retry` when no criterion is newly satisfied, `partial` when at least one required criterion remains, and `success` when none remain.
8. Unsafe or off-topic input returns `redirected`, no new criteria, and no persistent city mutation.

Client progress is untrusted but low-stakes: there is no account, leaderboard, or server persistence. Allowlisting prevents malformed state from changing contracts. Future competitive features would require server-owned progress and are outside scope.

## Mission registry

### Mission 1 — A Nova Escola / The New School

Paths: `compact_center`, `yard_neighborhood`.

Teaching concept: explicit goal, context, scale, and constraints.

Required criteria:

- `school_goal_clear`
- `school_branch_selected`
- `school_context_clear`
- `school_scale_defined`
- `school_accessible`
- `school_branch_feature_defined`

The vague first-attempt pattern—asking only to build a school—may extract the goal but not scale, context, access, or path. Local rules return `school_too_small`. `compact_center` requires a compact urban footprint; `yard_neighborhood` requires an explicit yard. Success effects differ by path.

### Mission 2 — Caminho Seguro / Safe Path

Paths: `smart_signals`, `calm_green_street`.

Teaching concept: examples and verifiable criteria.

Required criteria:

- `safe_path_goal_clear`
- `child_users_named`
- `path_branch_selected`
- `concrete_example_included`
- `safety_criteria_defined`
- `accessible_crossing_defined`
- `path_branch_requirements_defined`

`smart_signals` requires child-aware detection or timing plus enough crossing time. `calm_green_street` requires traffic calming plus trees/shade. Both paths require safe, accessible crossing behavior rather than visual decoration alone.

### Mission 3 — O Imprevisto / The Unexpected Event

Paths: `water_first`, `garbage_first`.

Teaching concept: decompose, prioritize, sequence, and review.

Required criteria:

- `both_service_problems_identified`
- `service_priority_selected`
- `priority_reasoned`
- `ordered_steps_defined`
- `secondary_service_preserved`
- `review_step_defined`

Both priorities are valid. Success depends on stating why one goes first, ordering work, preserving the secondary service, and reviewing results. Temporary delay effects visualize trade-offs without treating either valid path as morally wrong.

### Mission 4 — A Escola da Cidade / The City School

Paths: `ai_lab`, `reading_plaza`.

Teaching concept: compare creative variety with critical consistency.

Required criteria:

- `city_school_project_selected`
- `temperature_provided`
- `creative_temperature_tested`
- `critical_temperature_tested`
- `expected_behavior_explained`
- `project_constraints_defined`
- `temperature_comparison_complete`

`creative_design` accepts `medium` or `high` as appropriate and uses `low` to demonstrate repetitive output. `critical_instructions` accepts `low` as appropriate and uses `medium` or `high` to demonstrate unpredictability. Both steps call a real model with the selected sampling value. `temperature_comparison_complete` requires successful observations from both steps.

Temperature mapping:

```ts
const TEMPERATURES = {
  low: 0.2,
  medium: 0.7,
  high: 1.2,
} as const;
```

GPT-5.2 must use `reasoning: { effort: "none" }`; OpenAI documents `temperature`, `top_p`, and `logprobs` as supported only at that reasoning setting. Only temperature changes during the trial; `top_p` remains at its default.

## OpenAI calls

### Moderation

Call `omni-moderation-latest` before any evaluator or temperature-generation request. A flagged prompt returns a localized playful redirect with `unsafe_input_no_change`; it is not sent onward. If moderation is unavailable, return `503 moderation_unavailable`. Never evaluate unmoderated input.

### Semantic extraction

Use `gpt-5.6-luna` because this is a bounded, high-volume structured extraction task. Configure low reasoning effort, strict Structured Outputs, bounded output, `store: false`, and the stable privacy-preserving `safety_identifier`. The developer instruction contains the selected-language rubric; the player prompt is passed as user data.

### Temperature trial

Only `city_school` invokes GPT-5.2. After moderation, semantic extraction and temperature generation run concurrently. Generation receives the same explicit language context and a short, step-specific output format. Failure returns `temperatureTrial.status: "unavailable"`, preserves unrelated semantic progress, adds `temperature_trial_unavailable`, and withholds criteria that require a successful comparison.

## Feedback

Feedback is assembled from deterministic templates keyed by mission, language, status, next missing criterion, choice, and effect. Each response contains:

- `summary`: immediate outcome.
- `explanation`: why prompt produced that result, tied to one missing or newly satisfied criterion.
- `nextInstruction`: one concrete revision request, or `null` on mission success.

Feedback never echoes unsafe prompt content. Voice must speak the returned feedback rather than asking another model to reinterpret the evaluation.

## Failure behavior and fallback

| Condition | HTTP/result | Progress behavior |
|---|---|---|
| Invalid request | `400` structured error | No evaluation |
| Throttled identifier | `429 too_many_requests` | No evaluation |
| Flagged input | `200 redirected` | No new progress |
| Off-topic input | `200 redirected` | No new progress |
| Moderation unavailable | `503 moderation_unavailable` | No evaluation |
| Extraction timeout/rate limit/invalid schema | `200`, `source: fallback` | Conservative fallback may add explicit criteria |
| Fallback cannot conclude safely | `200 retry` with `evaluation_unavailable_no_change` | No new progress |
| Temperature generation failure | `200`, unavailable temperature trial | Preserve unrelated semantic progress; comparison incomplete |
| Unexpected server error | `500 internal_error` | No sensitive details |

Fallback runs only after successful moderation. It selects exactly one Portuguese or English lexicon from the supplied language, recognizes only pre-approved explicit demo phrases and criterion terms, never guesses ambiguous intent, and passes its result through the normal evaluator. Live/fallback source remains visible.

## Security and privacy

- Read `OPENAI_API_KEY` only in server modules; never serialize it into client code or responses.
- Do not persist raw prompts, transcripts, moderation results, generated temperature text, or model responses.
- Exclude raw prompt content from application and error logs.
- Use `store: false` for Responses API calls.
- Send a stable random UUID v4 installation identifier as `safety_identifier`; reject any other format.
- Limit input and all model-generated strings.
- Apply best-effort per-instance throttling by safety identifier; use project-level OpenAI limits as the deployment backstop. Distributed rate limiting requires external state and remains out of scope.
- Treat prompt injection text as player content. It cannot modify developer instructions, schemas, mission registry, or local rules.
- Never move the API key into the browser when deployment cannot protect server secrets.

## File boundaries

```text
src/app/api/missions/evaluate/route.ts
src/server/contracts/mission-evaluation.ts
src/server/missions/mission-registry.ts
src/server/missions/evaluate-mission.ts
src/server/missions/feedback/english.ts
src/server/missions/feedback/portuguese.ts
src/server/missions/fallback/english.ts
src/server/missions/fallback/portuguese.ts
src/server/openai/moderation.ts
src/server/openai/prompt-extractor.ts
src/server/openai/temperature-trial.ts
```

The route owns HTTP only. OpenAI adapters own network translation only. Mission evaluator and registry remain framework-independent and pure. Feedback/fallback catalogs may import shared criterion/effect types but never OpenAI SDK or Next.js modules.

## Testing

### Unit and contract tests

- Pure evaluator: no progress, one criterion, cumulative progress, repeated criteria, both paths, off-topic, unsafe redirect, mission completion, and Mission 4 cross-step completion.
- Dependency enforcement: path features require a path; comparison requires successful temperature generation.
- Schema validation: missing fields, extra fields, wrong criterion keys, overlong evidence, invalid choice, refusal, incomplete response, and contradiction.
- Request validation: every invalid mission-step pair, language omission/value, prompt bounds, attempt bounds, identifier bounds, and temperature presence/absence.
- Error mapping: moderation failure, extraction timeout, rate limit, invalid model output, fallback miss, and temperature generation failure.

### Fixed bilingual fixtures

Run 64 semantic fixtures: four missions × two languages × eight cases. Cases cover vague, partial, each complete path, synonyms, contradiction, off-topic, and prompt injection. Equivalent Portuguese and English meaning must yield equivalent criterion, status, and effect IDs.

Run 12 temperature fixtures: three choices × two steps × two languages. Assert numeric mapping, reasoning effort `none`, default `top_p`, localized generated instructions, observation key, and correct success/partial behavior.

Explicitly test language mismatch: the response and developer context remain in the parameter-selected language. No detection or automatic catalog switch occurs.

### Fallback and integration

- Test Portuguese and English fallback catalogs independently.
- Ensure fallback never grants criteria from the unselected language catalog.
- Keep live OpenAI integration tests opt-in behind `OPENAI_API_KEY`.
- Verify API key is absent from browser bundles and API payloads.
- Verify raw prompts are absent from logs and persistence.
- Verify every effect key emitted by code exists in `docs/ASSET-EFFECT-CATALOG.md`, and every catalog key exists in the canonical effect-key type.

## Acceptance criteria

- One endpoint evaluates all four missions without server history.
- Every request uses explicit `portuguese` or `english`; no auto-detection exists.
- Same semantic prompt in both languages yields equivalent game progress.
- Model output cannot directly declare success or mutate city state.
- Mission 4 performs real GPT-5.2 generations at `0.2`, `0.7`, or `1.2` with reasoning effort `none`.
- Unsafe and unmoderated input never reaches evaluator or generator.
- OpenAI failure never corrupts or regresses client progress.
- UI and voice consume identical localized feedback.
- Every returned effect key has an implementation-ready asset brief.

## Official OpenAI references

- [Responses API and Structured Outputs](https://developers.openai.com/api/reference/java/resources/beta/subresources/responses)
- [GPT-5.6 model guidance](https://developers.openai.com/api/docs/guides/latest-model)
- [GPT-5.2 temperature compatibility](https://developers.openai.com/api/docs/guides/latest-model?model=gpt-5.2)
- [Moderations API](https://developers.openai.com/api/reference/cli/resources/moderations)
