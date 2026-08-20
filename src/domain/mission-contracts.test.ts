import { describe, expect, it } from "vitest";

import { evaluateMissionResponseSchema } from "./mission-contracts";

describe("incremental mission response contract", () => {
  it("accepts an explicit empty regression set", () => {
    const response = evaluateMissionResponseSchema.parse({
      missionId: "apartment_construction",
      stepId: "plan",
      language: "english",
      source: "fallback",
      status: "partial",
      choice: "balanced_housing",
      progress: {
        satisfied: ["housing_goal_clear"],
        newlySatisfied: ["housing_goal_clear"],
        regressed: [],
        missing: ["housing_residents_defined"],
      },
      teachingConcept: "Clear prompts",
      feedback: {
        summary: "The project improved.",
        explanation: "Name the residents.",
        nextInstruction: "Name the residents.",
      },
      effectKeys: ["housing_plan_incomplete"],
    });

    expect(response.progress.regressed).toEqual([]);
  });
});
