import { describe, expect, it } from "vitest";

import {
  evaluateMissionRequestSchema,
  evaluateMissionResponseSchema,
} from "./mission-contracts";
import { evaluateMission } from "./missions/evaluate-mission";
import { fallbackMissionExtraction } from "./missions/fallback";
import { evaluateMissionPrompt } from "../server/evaluation/evaluate-prompt";

const safetyIdentifier = "install_1234567890abcdef";

describe("connected learning mission evaluation", () => {
  it("keeps supported school requirements while a revised scale regresses", () => {
    const initialRequest = evaluateMissionRequestSchema.parse({
      missionId: "school_construction",
      stepId: "design",
      language: "english",
      prompt: "Build a public school.",
      attempt: 1,
      satisfiedCriteria: [],
      selectedChoice: "school_hub",
      safetyIdentifier,
    });
    const initial = evaluateMission({
      request: initialRequest,
      source: "fallback",
      extraction: {
        offTopic: false,
        choice: "school_hub",
        criteria: {
          school_goal_clear: { met: true, evidence: "school" },
          school_public_defined: { met: true, evidence: "public" },
          school_location_defined: { met: true, evidence: "hub" },
          school_scale_defined: { met: true, evidence: "large" },
          school_accessible: { met: true, evidence: "accessible door" },
          school_safety_defined: { met: false, evidence: "" },
          school_site_selected: { met: true, evidence: "hub" },
        },
      },
    });

    const smallerRevision = evaluateMission({
      request: { ...initialRequest, attempt: 2, satisfiedCriteria: initial.progress.satisfied },
      source: "fallback",
      extraction: {
        offTopic: false,
        choice: "school_hub",
        criteria: {
          school_goal_clear: { met: true, evidence: "school" },
          school_public_defined: { met: true, evidence: "public" },
          school_location_defined: { met: true, evidence: "hub" },
          school_scale_defined: { met: false, evidence: "small" },
          school_accessible: { met: true, evidence: "accessible door" },
          school_safety_defined: { met: false, evidence: "" },
          school_site_selected: { met: true, evidence: "hub" },
        },
      },
    });

    expect(initial.status).toBe("partial");
    expect(initial.progress.newlySatisfied).toContain("school_scale_defined");
    expect(smallerRevision.progress.regressed).toEqual(["school_scale_defined"]);
    expect(smallerRevision.status).toBe("partial");
    expect(smallerRevision.progress.satisfied).toContain("school_accessible");
  });

  it("regresses a housing budget when the revision no longer supports it", () => {
    const request = evaluateMissionRequestSchema.parse({
      missionId: "apartment_construction",
      stepId: "plan",
      language: "english",
      prompt: "Build housing.",
      attempt: 2,
      satisfiedCriteria: ["housing_goal_clear", "housing_budget_defined"],
      selectedChoice: "balanced_housing",
      safetyIdentifier,
    });
    const result = evaluateMission({
      request,
      source: "fallback",
      extraction: {
        offTopic: false,
        choice: "balanced_housing",
        criteria: {
          housing_goal_clear: { met: true, evidence: "housing" },
          housing_residents_defined: { met: false, evidence: "" },
          housing_capacity_defined: { met: false, evidence: "" },
          housing_budget_defined: { met: false, evidence: "budget removed" },
          housing_accessibility_defined: { met: true, evidence: "step-free" },
          housing_green_space_defined: { met: false, evidence: "" },
        },
      },
    });

    expect(result.progress.regressed).toEqual(["housing_budget_defined"]);
    expect(result.status).toBe("partial");
    expect(result.progress.satisfied).toEqual([
      "housing_goal_clear",
      "housing_accessibility_defined",
    ]);
  });

  it("extracts the independent school requirements with the offline fallback", () => {
    const request = evaluateMissionRequestSchema.parse({
      missionId: "school_construction",
      stepId: "design",
      language: "english",
      prompt: "Build a public school for students and families at the school hub with 12 classrooms, an accessible door, secure crossings, and the school hub site.",
      attempt: 1,
      satisfiedCriteria: [],
      selectedChoice: "school_hub",
      safetyIdentifier,
    });

    const extraction = fallbackMissionExtraction(request);

    expect(extraction.choice).toBe("school_hub");
    expect(Object.entries(extraction.criteria)
      .filter(([, criterion]) => criterion.met)
      .map(([criterion]) => criterion)).toEqual([
      "school_goal_clear",
      "school_public_defined",
      "school_location_defined",
      "school_scale_defined",
      "school_accessible",
      "school_safety_defined",
      "school_site_selected",
    ]);
  });

  it.each([
    {
      missionId: "apartment_construction",
      stepId: "plan",
      language: "english",
      prompt: "Build balanced housing with 120 accessible apartments for neighborhood families, a $12 million budget, wheelchair access, and a green courtyard.",
      expectedChoice: "balanced_housing",
      expectedEffect: "housing_complete",
    },
    {
      missionId: "hospital_construction",
      stepId: "prioritize",
      language: "portuguese",
      prompt: "Construa hospital pronto para emergência, priorize pronto atendimento, capacidade de 80 leitos, acesso separado para ambulâncias, rotas seguras e meta de atender urgências em 10 minutos.",
      expectedChoice: "emergency_ready",
      expectedEffect: "hospital_complete",
    },
    {
      missionId: "urban_repair",
      stepId: "diagnose",
      language: "english",
      prompt: "Diagnose unsafe crossings caused by missing signals and accumulated waste caused by delayed collection. Fix mobility first because children face immediate risk, then sanitation; verify crossing safety and monitor both weekly.",
      expectedChoice: "mobility_then_sanitation",
      expectedEffect: "urban_repaired",
    },
  ])("fails closed for $missionId when provider extraction fails", async (fixture) => {
    const request = evaluateMissionRequestSchema.parse({
      missionId: fixture.missionId,
      stepId: fixture.stepId,
      language: fixture.language,
      prompt: fixture.prompt,
      attempt: 1,
      satisfiedCriteria: [],
      safetyIdentifier,
    });

    const result = await evaluateMissionPrompt(request, {
      moderation: { isFlagged: async () => false },
      extraction: { extractMission: async () => Promise.reject(new Error("offline provider")) },
    });

    expect(result.source).toBe("fallback");
    expect(result.status).toBe("retry");
    expect(result.choice).toBe(fixture.expectedChoice);
    expect(result.effectKeys).toEqual(["evaluation_unavailable_no_change"]);
    expect(result.effectKeys).not.toContain(fixture.expectedEffect);
    expect(result.progress).toMatchObject({
      satisfied: [],
      newlySatisfied: [],
      regressed: [],
    });
    expect(() => evaluateMissionResponseSchema.parse(result)).not.toThrow();
  });

  it("keeps incomplete provider failures recoverable without granting success", async () => {
    const request = evaluateMissionRequestSchema.parse({
      missionId: "apartment_construction",
      stepId: "plan",
      language: "english",
      prompt: "Build some apartments.",
      attempt: 1,
      satisfiedCriteria: [],
      safetyIdentifier,
    });

    const result = await evaluateMissionPrompt(request, {
      moderation: { isFlagged: async () => false },
      extraction: { extractMission: async () => Promise.reject(new Error("request timed out")) },
    });

    expect(result.status).toBe("retry");
    expect(result.progress.missing.length).toBeGreaterThan(0);
    expect(result.effectKeys).toEqual(["evaluation_unavailable_no_change"]);
    expect(result.effectKeys).not.toContain("housing_complete");
  });
});
