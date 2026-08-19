# Task 2 Report — Moderated Structured Evaluation Route

## Implementation

- Added `evaluatePrompt()` with injected moderation and extraction ports. It moderates first, redirects flagged prompts through the deterministic quest engine, validates live model output before evaluation, and selects a prepared fallback only for extraction/model/validation failures.
- Added `OpenAIEvaluationGateway`, using `omni-moderation-latest` and `gpt-5.6-luna` with an 8-second SDK timeout, `store: false`, `safety_identifier`, low reasoning, strict Zod structured output, and prompt-injection-resistant system instructions.
- Added `createEvaluatePost()` and the production `POST` route. The OpenAI client is created only while handling a request with an available project key. Responses validate inputs and turn results, do not cache successful responses, and never return key or upstream-error details.

## RED / GREEN Evidence

| Seam | RED command and result | GREEN command and result |
| --- | --- | --- |
| Evaluation service | `rtk npm test -- src/server/evaluation/evaluate-prompt.test.ts` — failed because `./errors` / evaluation service did not exist. | Same command — 7 tests passed. |
| OpenAI gateway | `rtk npm test -- src/server/evaluation/openai-gateway.test.ts` — failed because `./openai-gateway` did not exist. | Same command — 3 tests passed. |
| API route | `rtk npm test -- app/api/evaluate/route.test.ts` — failed because `./route` did not exist. | Same command — 5 tests passed. |

## Final Verification

`rtk npm test -- src/server/evaluation app/api/evaluate && rtk npm run typecheck && rtk npm run lint && rtk npm run build`

Result: passed — 3 test files / 15 tests, typecheck, ESLint, and the production Next.js build all succeeded. `rtk git diff --check` also completed without whitespace errors.

## Files

- `src/server/evaluation/evaluate-prompt.ts`
- `src/server/evaluation/evaluate-prompt.test.ts`
- `src/server/evaluation/openai-gateway.ts`
- `src/server/evaluation/openai-gateway.test.ts`
- `src/server/evaluation/errors.ts`
- `app/api/evaluate/route.ts`
- `app/api/evaluate/route.test.ts`

## Self-review

Manual standards and spec review found no actionable issues. The implementation keeps model interpretation separate from deterministic quest progression, fails closed when moderation is unavailable, limits fallback to post-moderation extraction failures, validates both external input and external structured output, and avoids exposing the project key.

## Concerns

No known functional concerns. Live OpenAI calls were intentionally not made because the tests use an injected client boundary; production credentials remain required for end-to-end external API verification. The pre-existing/generated untracked `tsconfig.tsbuildinfo` was deliberately left out of this task commit.
