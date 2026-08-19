import { describe, expect, it } from "vitest";

import type { NeedKey, PromptExtraction, TurnResult } from "./contracts";
import { evaluateQuest } from "./quest-engine";

function extraction(
  civicTraits: PromptExtraction["civicTraits"],
  offTopic = false,
): PromptExtraction {
  return {
    offTopic,
    promptBlueprint: {
      goal: true,
      context: true,
      constraints: true,
      output: true,
    },
    civicTraits,
    evidence: [],
    citizenLine: "The Town Hall plan is becoming clearer.",
    nextHint: "stateGoal",
  };
}

describe("evaluateQuest", () => {
  it.each<{
    name: string;
    currentPassedNeeds: NeedKey[];
    extraction: PromptExtraction;
    expected: TurnResult;
  }>([
    {
      name: "returns ready with the first requirement when no civic traits pass",
      currentPassedNeeds: [],
      extraction: extraction({ accessibleEntrance: false, clearSign: false, weatherCover: false }),
      expected: {
        source: "live",
        offTopic: false,
        repairDelta: [],
        passedNeeds: [],
        nextStage: "ready",
        citizenLine: "The Town Hall plan is becoming clearer.",
        nextHint: "requireAccessibleEntrance",
        celebration: false,
      },
    },
    {
      name: "adds one newly satisfied requirement",
      currentPassedNeeds: [],
      extraction: extraction({ accessibleEntrance: true, clearSign: false, weatherCover: false }),
      expected: {
        source: "live",
        offTopic: false,
        repairDelta: ["accessibleEntrance"],
        passedNeeds: ["accessibleEntrance"],
        nextStage: "partial",
        citizenLine: "The Town Hall plan is becoming clearer.",
        nextHint: "requireClearSign",
        celebration: false,
      },
    },
    {
      name: "adds two newly satisfied requirements in project-brief order",
      currentPassedNeeds: [],
      extraction: extraction({ accessibleEntrance: true, clearSign: true, weatherCover: false }),
      expected: {
        source: "live",
        offTopic: false,
        repairDelta: ["accessibleEntrance", "clearSign"],
        passedNeeds: ["accessibleEntrance", "clearSign"],
        nextStage: "partial",
        citizenLine: "The Town Hall plan is becoming clearer.",
        nextHint: "requireWeatherCover",
        celebration: false,
      },
    },
    {
      name: "restores Town Hall when all civic traits pass",
      currentPassedNeeds: [],
      extraction: extraction({ accessibleEntrance: true, clearSign: true, weatherCover: true }),
      expected: {
        source: "live",
        offTopic: false,
        repairDelta: ["accessibleEntrance", "clearSign", "weatherCover"],
        passedNeeds: ["accessibleEntrance", "clearSign", "weatherCover"],
        nextStage: "restored",
        citizenLine: "The Town Hall plan is becoming clearer.",
        nextHint: "celebrate",
        celebration: true,
      },
    },
    {
      name: "preserves existing progress without re-awarding a repeated trait",
      currentPassedNeeds: ["accessibleEntrance"],
      extraction: extraction({ accessibleEntrance: true, clearSign: false, weatherCover: false }),
      expected: {
        source: "live",
        offTopic: false,
        repairDelta: [],
        passedNeeds: ["accessibleEntrance"],
        nextStage: "partial",
        citizenLine: "The Town Hall plan is becoming clearer.",
        nextHint: "requireClearSign",
        celebration: false,
      },
    },
    {
      name: "completes cumulative progress from two existing needs",
      currentPassedNeeds: ["accessibleEntrance", "clearSign"],
      extraction: extraction({ accessibleEntrance: false, clearSign: false, weatherCover: true }),
      expected: {
        source: "live",
        offTopic: false,
        repairDelta: ["weatherCover"],
        passedNeeds: ["accessibleEntrance", "clearSign", "weatherCover"],
        nextStage: "restored",
        citizenLine: "The Town Hall plan is becoming clearer.",
        nextHint: "celebrate",
        celebration: true,
      },
    },
    {
      name: "redirects off-topic input while preserving sorted progress",
      currentPassedNeeds: ["clearSign", "accessibleEntrance"],
      extraction: extraction({ accessibleEntrance: true, clearSign: true, weatherCover: true }, true),
      expected: {
        source: "live",
        offTopic: true,
        repairDelta: [],
        passedNeeds: ["accessibleEntrance", "clearSign"],
        nextStage: "partial",
        citizenLine: "Let’s keep our attention on making Town Hall work for everyone.",
        nextHint: "playfulRedirect",
        celebration: false,
      },
    },
  ])("$name", ({ currentPassedNeeds, extraction: inputExtraction, expected }) => {
    const before = [...currentPassedNeeds];

    expect(
      evaluateQuest({
        currentPassedNeeds,
        extraction: inputExtraction,
        source: "live",
      }),
    ).toEqual(expected);
    expect(currentPassedNeeds).toEqual(before);
  });
});
