# Fixed prompt fixtures

`src/evals/prompt-fixtures.ts` holds the eight deterministic semantic cases for
the Town Hall quest. `runPromptFixtures()` deliberately accepts an injected
extractor, so these checks run without a network connection or an OpenAI client.

A future live gateway adapter may call the runner with its already-authorized
server-side extraction function. It must continue to validate through the
domain schema before invoking the quest engine and must report whether results
are live or fallback separately from this fixture harness.

Fixture reports contain only case names, pass/fail state, and bounded diagnostic
codes. They must never persist or log Player prompts, model evidence, citizen
lines, audio, API keys, safety identifiers, or upstream error details. Passing
these fixed fixtures verifies only the injected extractor contract; it does not
claim live API verification.
