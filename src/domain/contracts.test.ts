import { describe, expect, it } from "vitest";

import {
  evaluationRequestSchema,
  promptExtractionSchema,
  turnResultSchema,
} from "./contracts";

const validExtraction = {
  offTopic: false,
  promptBlueprint: {
    goal: true,
    context: true,
    constraints: false,
    output: true,
  },
  civicTraits: {
    accessibleEntrance: true,
    clearSign: false,
    weatherCover: false,
  },
  evidence: ["The plan specifies a ramp and a wide entrance."],
  citizenLine: "A step-free entrance will welcome every visitor.",
  nextHint: "requireClearSign",
};

const validTurnResult = {
  source: "live",
  offTopic: false,
  repairDelta: ["accessibleEntrance"],
  passedNeeds: ["accessibleEntrance"],
  nextStage: "partial",
  citizenLine: "A step-free entrance will welcome every visitor.",
  nextHint: "requireClearSign",
  celebration: false,
};

describe("evaluationRequestSchema", () => {
  it("accepts a bounded Town Hall evaluation request", () => {
    expect(
      evaluationRequestSchema.parse({
        prompt: "Build an accessible Town Hall.",
        questId: "town-hall",
        currentPassedNeeds: [],
        safetyIdentifier: "install_1234567890abcdef",
      }),
    ).toMatchObject({ questId: "town-hall" });
  });

  it.each([
    ["whitespace-only prompt", { prompt: "   " }],
    ["601-character prompt", { prompt: "a".repeat(601) }],
    ["unknown quest ID", { questId: "library" }],
    ["duplicate need", { currentPassedNeeds: ["accessibleEntrance", "accessibleEntrance"] }],
    ["unknown need", { currentPassedNeeds: ["bikeLane"] }],
    ["short safety identifier", { safetyIdentifier: "too-short" }],
  ])("rejects a %s", (_name, invalidValue) => {
    expect(
      evaluationRequestSchema.safeParse({
        prompt: "Build an accessible Town Hall.",
        questId: "town-hall",
        currentPassedNeeds: [],
        safetyIdentifier: "install_1234567890abcdef",
        ...invalidValue,
      }).success,
    ).toBe(false);
  });
});

describe("promptExtractionSchema", () => {
  it.each([
    ["missing fields", { ...validExtraction, citizenLine: undefined }],
    ["extra fields", { ...validExtraction, unapproved: true }],
    ["more than four evidence strings", { ...validExtraction, evidence: ["a", "b", "c", "d", "e"] }],
    ["evidence over 160 characters", { ...validExtraction, evidence: ["a".repeat(161)] }],
    ["citizen line over 220 characters", { ...validExtraction, citizenLine: "a".repeat(221) }],
    ["unknown hint key", { ...validExtraction, nextHint: "inventedHint" }],
  ])("rejects %s", (_name, invalidValue) => {
    expect(promptExtractionSchema.safeParse(invalidValue).success).toBe(false);
  });

  it("accepts the complete strict extraction shape", () => {
    expect(promptExtractionSchema.parse(validExtraction)).toEqual(validExtraction);
  });
});

describe("turnResultSchema", () => {
  it.each([
    ["extra fields", { ...validTurnResult, extra: true }],
    [
      "a restored result missing a Town Hall need",
      {
        ...validTurnResult,
        passedNeeds: ["accessibleEntrance", "clearSign"],
        nextStage: "restored",
        celebration: true,
      },
    ],
    ["a repair not present in passed needs", { ...validTurnResult, repairDelta: ["weatherCover"] }],
    ["a non-restored celebration", { ...validTurnResult, celebration: true }],
  ])("rejects %s", (_name, invalidValue) => {
    expect(turnResultSchema.safeParse(invalidValue).success).toBe(false);
  });

  it("accepts a consistent partial turn result", () => {
    expect(turnResultSchema.parse(validTurnResult)).toEqual(validTurnResult);
  });
});
