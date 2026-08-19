import { promptExtractionSchema } from "../domain/contracts";
import { evaluateQuest } from "../domain/quest-engine";
import { PROMPT_FIXTURES, type PromptFixture, type PromptFixtureName } from "./prompt-fixtures";

export type FixtureDiagnosticCode =
  | "invalid_extraction"
  | "extractor_rejected"
  | "extractor_timeout"
  | "semantic_mismatch"
  | "projection_mismatch";

export type FixtureCaseResult =
  | { name: PromptFixtureName; passed: true }
  | { name: PromptFixtureName; passed: false; diagnosticCode: FixtureDiagnosticCode };

export type FixtureRunReport = {
  cases: readonly FixtureCaseResult[];
  totals: { total: number; passed: number; failed: number };
  hasFailures: boolean;
};

export type PromptExtractor = (prompt: string) => Promise<unknown>;

function isTimeoutLikeRejection(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || /\b(timeout|timed out|abort(?:ed)?)\b/i.test(error.message))
  );
}

function hasExpectedSemantics(
  fixture: PromptFixture,
  extraction: { offTopic: boolean; civicTraits: PromptFixture["expected"]["civicTraits"] },
): boolean {
  return (
    extraction.offTopic === fixture.expected.offTopic &&
    extraction.civicTraits.accessibleEntrance === fixture.expected.civicTraits.accessibleEntrance &&
    extraction.civicTraits.clearSign === fixture.expected.civicTraits.clearSign &&
    extraction.civicTraits.weatherCover === fixture.expected.civicTraits.weatherCover
  );
}

function hasExpectedProjection(
  fixture: PromptFixture,
  result: ReturnType<typeof evaluateQuest>,
): boolean {
  const expected = fixture.expected.turnResult;

  return (
    result.nextStage === expected.nextStage &&
    result.celebration === expected.celebration &&
    result.repairDelta.length === expected.repairDelta.length &&
    result.repairDelta.every((need, index) => need === expected.repairDelta[index]) &&
    result.passedNeeds.length === expected.passedNeeds.length &&
    result.passedNeeds.every((need, index) => need === expected.passedNeeds[index])
  );
}

async function runFixture(fixture: PromptFixture, extract: PromptExtractor): Promise<FixtureCaseResult> {
  let candidate: unknown;

  try {
    candidate = await extract(fixture.prompt);
  } catch (error) {
    return {
      name: fixture.name,
      passed: false,
      diagnosticCode: isTimeoutLikeRejection(error) ? "extractor_timeout" : "extractor_rejected",
    };
  }

  const parsedExtraction = promptExtractionSchema.safeParse(candidate);

  if (!parsedExtraction.success) {
    return { name: fixture.name, passed: false, diagnosticCode: "invalid_extraction" };
  }

  const semanticsMatch = hasExpectedSemantics(fixture, parsedExtraction.data);

  const result = evaluateQuest({
    currentPassedNeeds: fixture.currentPassedNeeds,
    extraction: parsedExtraction.data,
    source: "live",
  });

  if (!semanticsMatch) {
    return { name: fixture.name, passed: false, diagnosticCode: "semantic_mismatch" };
  }

  return hasExpectedProjection(fixture, result)
    ? { name: fixture.name, passed: true }
    : { name: fixture.name, passed: false, diagnosticCode: "projection_mismatch" };
}

export async function runPromptFixtures({
  extract,
  fixtures = PROMPT_FIXTURES,
}: {
  extract: PromptExtractor;
  fixtures?: readonly PromptFixture[];
}): Promise<FixtureRunReport> {
  const cases: FixtureCaseResult[] = [];

  for (const fixture of fixtures) {
    cases.push(await runFixture(fixture, extract));
  }

  const passed = cases.filter((result) => result.passed).length;
  const failed = cases.length - passed;

  return {
    cases,
    totals: { total: cases.length, passed, failed },
    hasFailures: failed > 0,
  };
}
