import { describe, expect, it } from "vitest";

import {
  evaluateMissionRequestSchema,
  evaluateMissionResponseSchema,
} from "./mission-contracts";
import { evaluateMissionPrompt } from "../server/evaluation/evaluate-prompt";

const safetyIdentifier = "install_1234567890abcdef";

describe("connected learning mission evaluation", () => {
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
